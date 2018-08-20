import XElement from '/libraries/x-element/x-element.js';
import XExpandable from '../x-expandable/x-expandable.js';
import XAccount from './x-account.js';
import XAccountsList from './x-accounts-list.js';
import MixinRedux from '/secure-elements/mixin-redux/mixin-redux.js';
import { getString } from '../strings.js';

export default class XAccountsDropdown extends MixinRedux(XElement) {

    html() {
        return `
            <x-expandable dropdown disabled>
                <div expandable-trigger>
                    <h3 status-message></h3>
                    <x-account></x-account>
                </div>
                <div expandable-content>
                    <x-accounts-list no-vesting></x-accounts-list>
                </div>
            </x-expandable>
            <input type="hidden">
        `;
    }

    children() {
        return [ XExpandable, XAccount, XAccountsList ];
    }

    onCreate() {
        this.$statusMessage = this.$('[status-message]');
        this.$input = this.$('input');
        if (this.attributes.name) {
            this.$input.setAttribute('name', this.attributes.name);
        }
        this.$account.addEventListener('x-account-selected', e => e.stopPropagation());
        this._isDisabled = false;
        super.onCreate();
    }

    static mapStateToProps(state) {
        return {
            accounts: state.accounts.entries,
            hasContent: state.accounts.hasContent,
            loading: state.accounts.loading
        };
    }

    _onPropertiesChanged(changes) {
        if (changes.loading === true || changes.hasContent === false
            || this.properties.accounts.size === 0) {
            this.$expandable.disable();
            this._showStatusMessage();
            return;
        }

        !this._isDisabled && this.$expandable.enable();

        if (changes.accounts && !this.selectedAccount) {
            this.selectDefaultAccount();
        }
    }

    selectDefaultAccount() {
        if (!this.properties.accounts) return;
        // pre select some arbitrary account
        const accounts = this.properties.accounts.values();
        let account;
        do {
            account = accounts.next().value;
        } while (account === 4) // Do not auto-select vesting accounts
        this.selectedAccount = account;
    }

    listeners() {
        return {
            'x-account-selected x-accounts-list': this._onAccountSelected
        };
    }

    get selectedAccount() {
        const account = this.$account.account;
        // An XAccount.account always has the height property,
        // thus we check if there are any more than that one
        // todo remove height from account objects and find a less hacky solution
        return Object.keys(account).length > 1 ? account : null;
    }

    set selectedAccount(account) {
        if (typeof(account) === 'string') {
            // user friendly address
            account = this.properties.accounts.get(account);
        }
        if (!account) return;
        this.$account.account = account;
        this.$input.value = account.address;
        this.fire('x-account-selected', account.address);
    }

    _showStatusMessage() {
        if (this.properties.accounts.size === 0) {
            this.$statusMessage.textContent = '';
            const dots = document.createElement('span');
            dots.classList.add('dot-loader');
            this.$statusMessage.appendChild(dots);
        } else {
            this.$statusMessage.textContent = getString('no_acccounts');
        }
    }

    _onAccountSelected(address) {
        const account = this.properties.accounts.get(address);
        this.$account.setProperties(account);
        this.$input.value = account.address;
        this.$expandable.collapse();
    }

    disable() {
        this._isDisabled = true;
        this.$expandable.disable();
    }

    enable() {
        this._isDisabled = false;
        this.$expandable.enable();
    }
}
