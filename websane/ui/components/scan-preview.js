import {LitElement, html} from '@polymer/lit-element';

class ScanPreview extends LitElement {
	static get properties () {
		return {
			scan: {type: Object},
			highlighted: {type: Boolean},
			selected: {type: Boolean}
		};
	}

	render () {
		return html`
			<style>
				img {
					border: 2px solid #6c757d;
					display: block;
					margin: 0px auto 15px auto;
					box-shadow: 0px 0px 3px #666666;
					max-width: 250px;
					max-height: 250px;
				}

				img.highlighted {
					max-width: 300px;
					max-height: 300px;
				}

				img.selected {
					border-color: #007bff;
				}

				img.skip {
					border-color: #6c757d;
					opacity: 0.3;
				}
			</style>
			<div>
				<img
					src="/scans/${this.scan.batch}/${this.scan.id}.tiff.preview.jpg"
					class="${(this.highlighted) ? 'highlighted' : ''} ${(this.selected) ? 'selected' : ''} ${(this.scan.skip) ? 'skip' : ''}"
					style="transform: rotate(${this.scan.rotate || 0}deg)"
				>
			</div>
		`;
	}
}

customElements.define('scan-preview', ScanPreview);
