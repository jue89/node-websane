import {LitElement, html} from '@polymer/lit-element';

class ScanShow extends LitElement {
	static get properties () {
		return {
			scan: {type: Object}
		};
	}

	render () {
		return html`
			<style>
				div {
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100%;
				}

				img {
					border: 2px solid #6c757d;
					display: block;
					box-shadow: 0px 0px 3px #666666;
					max-height: 90vh;
					max-width: 90vh;
				}

				img.skip {
					opacity: 0.3;
				}
			</style>
			<div>
				<img
					src="/scans/${this.scan.batch}/${this.scan.id}.tiff.preview.jpg"
					class="${this.scan.skip ? 'skip' : ''}"
					style="transform: rotate(${this.scan.rotate || 0}deg)"
				>
			</div>
		`;
	}
}

customElements.define('scan-show', ScanShow);
