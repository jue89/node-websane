import {LitElement, html} from '@polymer/lit-element';
import './scan-preview.js';
import './scan-show.js';

const THRESHOLD = 0.0001;

const getMinMax = (values, threshold) => {
	let max = 255;
	while (values[max] < threshold && max >= 0) max--;
	let min = 0;
	while (values[min] < threshold && min <= 255) min++;
	return [min, max];
};

const fetchScanMeta = async (scan) => {
	const rsp = await fetch('/scans/' + scan + '.tiff.meta.json');
	const data = await rsp.json();
	const [vmin, vmax] = getMinMax(data.v, THRESHOLD);
	const vdiff = vmax - vmin;
	const skip = vdiff < 100;
	const [smin, smax] = getMinMax(data.s, THRESHOLD);
	const sdiff = smax - smin;
	const colorPage = sdiff > 60;
	return {vmin, vmax, vdiff, smin, smax, sdiff, skip, colorPage};
}

class ScannerApp extends LitElement {
	static get properties () {
		return {
			scans: {type: Array},
			scanSelected: {type: Number}
		};
	}

	constructor () {
		super();
		const script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', '/socket.io/socket.io.js');
		this.appendChild(script);
		script.onload = () => {
			const socket = io.connect();
			socket.on('scan-add', async (s) => {
				const [batch, id] = s.split('/');
				const info = await fetchScanMeta(s);
				let idx = this.scanFind(batch, id);
				if (idx === -1) {
					this.scanInsert(batch, id, info);
				} else {
					this.scanUpdate(idx, info);
				}
			}).on('scan-remove', (s) => {
				const [batch, id] = s.split('/');
				const idx = this.scanFind(batch, id);
				if (idx === -1) return;
				const info = {deleted: true};
				this.scanUpdate(idx, info);
			});
		};
		this.scans = [];
		this.scanSelected = 0;
	}

	scanFind (batch, id) {
		return this.scans.findIndex((s) => s.batch === batch && s.id === id);
	}

	scanInsert (batch, id, info = {}) {
		// update info
		info.batch = batch;
		info.id = id;

		// find index of the new scan object
		let idx = this.scans.findIndex((s) => s.batch > batch && s.id > id);
		if (idx === -1) idx = this.scans.length;

		// insert new object
		this.scans = [
			...this.scans.slice(0, idx),
			info,
			...this.scans.slice(idx)
		];

		return idx;
	}

	scanUpdate (idx, info = {}) {
		this.scans = [
			...this.scans.slice(0, idx),
			Object.assign({}, this.scans[idx], info),
			...this.scans.slice(idx + 1)
		];
	}

	scanSwap (idx1, idx2) {
		if (idx1 > idx2) {
			const tmp = idx2;
			idx2 = idx1;
			idx1 = tmp;
		}
		const scan1 = this.scans[idx1];
		if (!scan1) return;
		const scan2 = this.scans[idx2];
		if (!scan2) return;
		this.scans = [
			...this.scans.slice(0, idx1),
			scan2,
			...this.scans.slice(idx1 + 1, idx2),
			scan1,
			...this.scans.slice(idx2 + 1)
		];
		return true;
	}

	selScanNext () {
		const newIdx = this.scanSelected + 1;
		if (!this.scans[newIdx] || this.scans[newIdx].deleted) return;
		const node = this.shadowRoot.querySelector(`#scan-${this.scanSelected}`)
		if (node) node.scrollIntoView({behavior: 'smooth'});
		this.scanSelected = newIdx;
	}

	selScanPrev () {
		const newIdx = this.scanSelected - 1;
		if (!this.scans[newIdx] || this.scans[newIdx].deleted) return;
		this.scanSelected = newIdx;
		const node = this.shadowRoot.querySelector(`#scan-${this.scanSelected}`)
		if (node) node.scrollIntoView({behavior: 'smooth'});
	}

	rotateScan (angle) {
		let rotate = this.scans[this.scanSelected].rotate || 0;
		rotate += angle;
		if (rotate === 360 || rotate === -360) rotate = 0;
		this.scanUpdate(this.scanSelected, {rotate});
	}

	onKeydown (e) {
		if (e.key === 'ArrowDown' && e.altKey) {
			if (!this.scanSwap(this.scanSelected, this.scanSelected + 1)) return;
			this.selScanNext();
		} else if (e.key === 'ArrowUp' && e.altKey) {
			if (!this.scanSwap(this.scanSelected, this.scanSelected - 1)) return;
			this.selScanPrev();
		} else if (e.key === 'ArrowDown') {
			this.selScanNext();
		} else if (e.key === 'ArrowUp') {
			this.selScanPrev();
		} else if (e.key === 'ArrowRight') {
			this.rotateScan(90);
		} else if (e.key === 'ArrowLeft') {
			this.rotateScan(-90);
		} else if (e.key === ' ') {
			const skip = !this.scans[this.scanSelected].skip;
			this.scanUpdate(this.scanSelected, {skip});
		} else {
			return;
		}
		e.preventDefault();
	}

	render () {
		let batch;
		return html`
			<link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.min.css">
			<style>
				.scanner-main {
					margin-top: 56px;
				}
				.scanner-sidebar {
					position: sticky;
					overflow-x: hidden;
					overflow-y: scroll;
					max-height: calc(100vh - 56px);
					min-height: calc(100vh - 56px);
					border-right: 1px solid rgba(0,0,0,.1);
					width: 320px;
				}
				.scanner-detail {
					position: sticky;
					overflow: hidden;
					max-height: calc(100vh - 56px);
					min-height: calc(100vh - 56px);
					width: calc(100vw - 320px);
				}
				p {
					padding-top: 32px;
					text-align: center;
				}
				scan-show {
					display: block;
					width: 100%;
					height: 100%;
				}
			</style>
			<nav class="navbar navbar-expand navbar-dark bg-dark fixed-top">
				<a class="navbar-brand" href="#">Scanner</a>
			</nav>
			<div class="scanner-main container-fluid" tabindex="-1" @keydown="${this.onKeydown}">
				<div class="row flex-xl-nowrap">
					<div class="scanner-sidebar">
						${this.scans.filter((s) => !s.deleted).map((scan, scanIdx) => html`
							<!-- batch heading -->
							${(scan.batch !== batch) ? html`<p>${batch = scan.batch}</p>` : ''}

							<!-- preview picture -->
							${html`<scan-preview
								id="scan-${scanIdx}"
								.scan="${scan}"
								.highlighted="${scanIdx === this.scanSelected}"
								.selected="${scanIdx <= this.scanSelected}"
								@click="${() => {this.scanSelected = scanIdx;}}"
							>`}
						`)}
					</div>
					<div class="scanner-detail">
						${(this.scans[this.scanSelected] && !this.scans[this.scanSelected].deleted) ? html`
							<scan-show .scan="${this.scans[this.scanSelected]}"></scan-show>
						` : ''}
					</div>
				</div>
			</div>
		`;
	}
}

customElements.define('scanner-app', ScannerApp);