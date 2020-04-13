import {LitElement, html} from '@polymer/lit-element';
import {PDFDocument} from 'pdfkit/js/pdfkit.standalone.js';
import './meta.js';

class Scan extends LitElement {
	static get properties () {
		return {
			batchName: {type: String},
			scan: {type: Object},
			selected: {type: Boolean},
			rotate: {type: Number}
		};
	}

	setSelected (mode) {
		if (mode === undefined) {
			this.selected = !this.selected;
		} else {
			this.selected = mode;
		}

		if (this.selcted) {
			const pdf = new PDFDocument();
		}
	}

	render () {
		return html`
			<style>
				img {
					display: block;
					max-height: 70%;
					margin: 30px 30px 30px 30px;
					border: 3px solid #ffffff;
					box-shadow: 0px 0px 10px #333333;
					opacity: 0.3;
				}

				img.selected {
					opacity: 1;
				}
			</style>
			${this.scan.types['.tiff.preview.jpg'] ? html`
				<img
					class="${this.selected ? 'selected' : ''}"
					style="${this.rotate ? `transform: rotate(${this.rotate}deg)` : ''}"
					src="/scans/${this.batchName}/${this.scan.name}.tiff.preview.jpg" @click="${() => this.setSelected()}"
				>
			` : ''}
			${this.scan.types['.tiff.meta.json'] ? html`
				<scanner-scan-meta .path="/scans/${this.batchName}/${this.scan.name}.tiff.meta.json" @on-load="${(e) => this.setSelected(!e.detail.message.emptyPage)}"></scanner-scan-meta>
			` : ''}
		`;
	}
}

customElements.define('scanner-scan', Scan);
