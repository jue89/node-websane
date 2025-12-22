import {LitElement, html} from '@polymer/lit-element';

const THRESHOLD = 0.0001;

const getMinMax = (values, threshold) => {
	let max = 255;
	while (values[max] < threshold && max >= 0) max--;
	let min = 0;
	while (values[min] < threshold && min <= 255) min++;
	return [min, max];
};

class Meta extends LitElement {
	static get properties () {
		return {
			path: {type: String},
			data: {type: Object}
		};
	}

	updated(changedProperties) {
		if (changedProperties.has('path')) {
			fetch(this.path).then((rsp) => {
				return rsp.json();
			}).then((data) => {
				const [vmin, vmax] = getMinMax(data.v, THRESHOLD);
				const vdiff = vmax - vmin;
				const emptyPage = vdiff < 100;
				const [smin, smax] = getMinMax(data.s, THRESHOLD);
				const sdiff = smax - smin;
				const colorPage = sdiff > 60;
				this.data = {vmin, vmax, vdiff, smin, smax, sdiff, emptyPage, colorPage};
			});
		}

		if (changedProperties.has('data')) {
			this.dispatchEvent(new CustomEvent('on-load', {
				detail: {
					message: this.data
				}
			}));
		}
	}
}

customElements.define('scanner-scan-meta', Meta);
