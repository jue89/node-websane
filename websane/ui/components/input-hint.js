import {LitElement, html} from '@polymer/lit-element';

class InputHint extends LitElement {
	static get properties () {
		return {
			// Public
			icon: {type: String},
			placeholder: {type: String},
			hints: {type: Array},
			value: {type: String},
			maxHints: {type: Number},

			// Private
			displayHints: {type: Array},
			activeHint: {type: Number}
		};
	}

	constructor () {
		super();
		this.activeHint = -1;
		this.sortedHints = null;
		this.displayHints = [];

		// Defaults ... may be overwritten during connect to DOM
		this.value = '';
		this.hints = [];
		this.maxHints = 10;
		this.placeholder = '';
		this.icon = '';
	}

	connectedCallback () {
		super.connectedCallback();

		// Propagate focus events down to the input field
		this.addEventListener('focus', () => {
			this.shadowRoot.querySelector('#input').focus();
		});
	}

	updated (changedProperties) {
		if (changedProperties.has('hints')) {
			// Make sorted hints invalid.
			// They will be recreated once they are required.
			this.sortedHints = null;
		}
	}

	getSortedHints () {
		// Sort hints if they haven't, yet
		if (!this.sortedHints) {
			this.sortedHints = (this.hints || []).map((h) => {
				if (typeof h === 'string') return {hint: h, prio: 0}
				if (h.prio === undefined) h.prio = 0;
				return h;
			}).sort((a, b) => {
				if (a.prio > b.prio) return -1;
				if (a.prio < b.prio) return 1;
				if (a.hint > b.hint) return 1;
				if (a.hint < b.hint) return -1;
				return 0;
			});
		}
		return this.sortedHints;
	}

	setValue (value) {
		if (value === this.value) return;
		this.value = value;
		this.dispatchEvent(new Event('change'));

		if (value) {
			// Display hints only if any value has been typed in
			const valueLow = value.toLowerCase().trim();
			this.displayHints = this.getSortedHints().filter((h) => {
				// Don't be case-sensitive
				const hint = h.hint.toLowerCase();
				// Ignore direct matches
				if (hint === valueLow) return false;
				// Only display hints with the first letters matching
				return hint.indexOf(valueLow) === 0;
			}).slice(0, this.maxHints);
			this.activeHint = -1;
		} else {
			this.displayHints = [];
		}

	}

	hideHints () {
		this.displayHints = [];
	}

	navigateHints (direction) {
		this.activeHint += direction;
		if (this.activeHint < 0) this.activeHint = 0;
		else if (this.activeHint > this.displayHints.length - 1) this.activeHint = this.displayHints.length - 1;
	}

	render () {
		return html`
			<link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.min.css">
			<link rel="stylesheet" href="node_modules/open-iconic/font/css/open-iconic-bootstrap.min.css">
			<style>
				.input-group {
					padding: 0;
				}

				#hints {
					position: absolute;
					z-index: 999;
					top: 38px;
					left: 46px;
					background: #fff;
					border: 1px solid #ced4da;
					border-radius: .25rem;
					width: calc(100% - 46px - 5px);
					overflow: hidden;
				}

				#hints p {
					text-align: left;
					padding: 4px 12px 5px 12px;
					margin: 0px;
					border-bottom: 1px solid #ced4da;
				}

				#hints p:last-child {
					border-bottom: none;
				}

				#hints p.active {
					background-color: var(--primary);
					color: var(--white)
				}
			</style>
			<div class="input-group col-12">
				<div class="input-group-prepend">
					<span class="input-group-text"><i class="oi ${this.icon}"></i></span>
				</div>
				<input
					type="text"
					class="form-control"
					id="input"
					placeholder="${this.placeholder}"
					tabindex="-1"
					.value="${this.value}"
					@keyup="${(e) => {
						if (e.key === 'ArrowDown') {
							if (this.value === '' && this.displayHints.length === 0) {
								this.displayHints = this.getSortedHints().slice(0, this.maxHints);
							} else {
								this.navigateHints(1);
							}
						} else if (e.key === 'ArrowUp') {
							this.navigateHints(-1);
						} else if (e.key === 'Enter') {
							if (this.activeHint > -1) this.setValue(this.displayHints[this.activeHint].hint);
						} else if (e.key === 'Escape') {
							this.activeHint = -1;
						} else {
							const path = e.path || (e.composedPath && e.composedPath());
							this.setValue(path[0].value)
						}
					}}"
					@blur="${(e) => this.hideHints()}"
				></input>
			</div>
			${(this.displayHints.length > 0) ? html`
				<div id="hints">
					${this.displayHints.map((h, n) => html`
						<p
							class="${(n == this.activeHint) ? 'active' : ''}"
						>${h.hint}</p>
					`)}
				</div>
			`: ''}
		`;
	}
}

customElements.define('input-hint', InputHint);
