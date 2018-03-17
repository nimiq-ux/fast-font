import XElement from '/libraries/x-element/x-element.js';
import XAccount from './x-account.js';

export default class XAccounts extends XElement {
    html() {
        return `
            <button create class="small">&plus; Create</button>
            <button import class="small">&#8615; Import</button>
            <x-accounts-list></x-accounts-list>
        `
    }

    onCreate() {
        this._accounts = new Map();
        this.$accountsList = this.$('x-accounts-list');
        this.$('button[create]').addEventListener('click', e => this._onCreateAccount());
        this.$('button[import]').addEventListener('click', e => this._onImportAccount());
    }

    /**
     * @param {array} accounts: Array of account objects
     */
    set accounts(accounts) {

        accounts.forEach(account => {
            const stored = this._accounts.get(account.address || account.number);

            if (!stored) {
                this._accounts.set(account.address || account.number, [account, this._createAccount(account)]);
                return;
            }

            const [storedAccount, accountElement] = stored;

            // Check if properties changed
            for(const prop in account) {
                if (storedAccount[prop] !== account[prop]) {
                    // Update display
                    accountElement[prop] = account[prop];
                    // Update stored account
                    storedAccount[prop] = account[prop];
                }
            }
        });

        // Remove unpassed accounts
        const storedAddresses = Array.from(this._accounts.keys());
        const passedAddresses = accounts.map(a => a.address || a.number);

        const removedAddresses = storedAddresses.filter(address => !passedAddresses.includes(address));

        removedAddresses.forEach(address => {
            const [storedAccount, accountElement] = this._accounts.get(address);
            accountElement.$el.parentNode.removeChild(accountElement.$el);
            this._accounts.delete(address);
        });
    }

    /**
     * @param {object} account
     */
    addAccount(account) {
        this._accounts.set(account.address || account.number, [account, this._createAccount(account)]);
        // this.accounts = [...Array.from(this._accounts.values()).map(i => i[0]), account];
    }

    _createAccount(account) {
        const $account = XAccount.createElement();

        $account.label = account.label;
        $account.address = account.address || account.number;
        $account.balance = account.balance;
        $account.secure = account.secure;

        this.$accountsList.appendChild($account.$el);

        return $account;
    }

    _onCreateAccount() {
        this.fire('x-accounts-create');
    }

    _onImportAccount() {
        this.fire('x-accounts-import');
    }
}
