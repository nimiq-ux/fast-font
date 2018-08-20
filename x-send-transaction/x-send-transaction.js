import UTF8Tools from '/libraries/secure-utils/utf8-tools/utf8-tools.js';
import XElement from '/libraries/x-element/x-element.js';
import XAccountsDropdown from '../x-accounts/x-accounts-dropdown.js';
import XAddressInput from '../x-address-input/x-address-input.js';
import XAmountInput from '../x-amount-input/x-amount-input.js';
import XFeeInput from '../x-fee-input/x-fee-input.js';
import XExtraDataInput from '../x-extra-data-input/x-extra-data-input.js';
import XExpandable from '../x-expandable/x-expandable.js';
import networkClient from '/apps/safe/src/network-client.js';
import MixinRedux from '/secure-elements/mixin-redux/mixin-redux.js';
import XPopupMenu from '/elements/x-popup-menu/x-popup-menu.js';
import Config from '/libraries/secure-utils/config/config.js';
import AccountType from '../../libraries/account-manager/account-type.js';
import VContactListModal from '/elements/v-contact-list/v-contact-list-modal.js';
import { getString } from '../strings.js';

export default class XSendTransaction extends MixinRedux(XElement) {
    html() {
        return `
            <div class="modal-header">
                <!-- <x-popup-menu left-align>
                    <button prepared><i class="material-icons">unarchive</i> ${getString('prepared_transaction')}</button>
                </x-popup-menu> -->
                <i x-modal-close class="material-icons">close</i>
                <h2>New Transaction</h2>
            </div>
            <form class="modal-body">
                <h3>${getString('send_from')}</h3>
                <x-accounts-dropdown name="sender"></x-accounts-dropdown>
                <span error sender class="display-none"></span>

                <h3>${getString('send_to')} <span class="link-contact-list">${getString('contact_list')}</span></h3>
                <div class="row">
                    <x-address-input class="multiline" name="recipient"></x-address-input>
                </div>
                <span error recipient class="display-none"></span>

                <h3>${getString('tx_amount')}</h3>
                <div class="row">
                    <x-amount-input name="value" no-screen-keyboard enable-set-max></x-amount-input>
                </div>
                <span error amount class="display-none"></span>

                <x-expandable advanced-settings transparent>
                    <h3 expandable-trigger>${getString('advanced_settings')}</h3>
                    <div expandable-content>
                        <div class="extra-data-section">
                            <h3>${getString('tx_message')}</h3>
                            <div class="row">
                                <x-extra-data-input name="extraData" max-bytes="64"></x-extra-data-input>
                            </div>
                        </div>

                        <h3>${getString('tx_fee')}</h3>
                        <div class="row">
                            <x-fee-input name="fee" max-sats="2"></x-fee-input>
                        </div>
                        <span error fees class="display-none"></span>

                        <h3>${getString('tx_valid_from')}</h3>
                        <small>${getString('tx_valid_from_hint_1')}</small>
                        <small>${getString('tx_valid_from_hint_2')}</small>
                        <div class="row">
                            <input name="validityStartHeight" validity-start placeholder="0" type="number" min="0" step="1">
                        </div>
                        <span error start-height class="display-none"></span>
                    </div>
                </x-expandable>

                <div class="center row">
                    <button send>${getString('tx_send')}</button>
                </div>
            </form>
        `
    }

    children() {
        return [ /*XPopupMenu,*/ XAccountsDropdown, XAddressInput, XAmountInput, XFeeInput, XExpandable, XExtraDataInput ];
    }

    onCreate() {
        this.$form = this.$('form');
        this.$button = this.$('button[send]');
        this.$addressInput.placeholderColor = '#bbb';

        this.__debouncedValidateRecipient = this.debounce(this.__validateRecipient, 1000, true);

        // To work around the double x-address-input-valid event
        // which happens because of the address formatting when
        // pasting a full address
        this.__lastValidatedValue = null;
        this.__validateRecipientTimeout = null;

        this._errorElements = {};

        this._isSetMax = false;

        this.clear();

        super.onCreate();
    }

    styles() {
        return [ ...super.styles(), 'x-send-transaction' ];
    }

    static mapStateToProps(state) {
        return {
            hasConsensus: state.network.consensus === 'established'
        }
    }

    listeners() {
        return {
            'submit form': this._onSubmit.bind(this),
            'x-account-selected': () => this._validateField('sender'),
            'x-address-input-valid': () => this._validateField('recipient'),
            'input input[name="value"]': () => this._validateField('amount'),
            'input input[name="fee"]': () => this._validateField('fees'),
            'input input[name="validityStartHeight"]': () => this._validateField('validityStartHeight'),
            // 'click button[prepared]': () => this.fire('x-send-prepared-transaction'),
            'x-amount-input-set-max': this._onAmountSetMax,
            'x-fee-input-changed': this._onFeeChanged,
            'x-extra-data-input-changed-size': this._onExtraDataChangedSize,
            'click .link-contact-list': this._onClickContactList
        }
    }

    set sender(accountOrAddress) {
        this.$accountsDropdown.selectedAccount = accountOrAddress;
    }

    set recipient(address) {
        this.$addressInput.value = address;
    }

    set amount(amount) {
        this.$amountInput.value = amount;
    }

    set message(message) {
        this.$extraDataInput.value = message;
    }

    _onSubmit(e) {
        e.preventDefault();
        if (!this._isValid()) return;

        const tx = this._getFormData(this.$form);
        tx.extraData = UTF8Tools.stringToUtf8ByteArray(tx.extraData);
        tx.network = Config.network;
        this.fire('x-send-transaction', tx);
    }

    clear() {
        this.$addressInput.value = '';
        this.$amountInput.value = '';
        this.$extraDataInput.value = '';
        this.$feeInput.value = 0;
        this.$form.querySelector('input[name="validityStartHeight"]').value = '';
        this.$expandable.collapse();
        this.$accountsDropdown.selectDefaultAccount();
        this.$accountsDropdown.enable();
        this.loading = false;
        this.fire('x-send-transaction-cleared');
    }

    validateAllFields() {
        this._validateSender();
        this._validateRecipient();
        this._validateAmountAndFees();
        this._validateValidityStartHeight();
        this.setButton();
    }

    set loading(isLoading) {
        this._isLoading = !!isLoading;
        this.$button.textContent = this._isLoading ? 'Loading' : 'Send';
        this.setButton();
    }

    _getFormData(form) {
        const formData = {};
        form.querySelectorAll('input').forEach(i => formData[i.getAttribute('name')] = i.value);
        return formData;
    }

    _onAmountSetMax() {
        const account = this.$accountsDropdown.selectedAccount;
        this.$amountInput.maxDecimals = 5;
        this.$amountInput.value = account.balance - this.$feeInput.value;
        this._isSetMax = true;
    }

    _onFeeChanged(fee) {
        if (this._isSetMax) this._onAmountSetMax();
    }

    _onExtraDataChangedSize(size) {
        if (size > 0) this.$feeInput.txSize = 166 + size;
        else this.$feeInput.txSize = 138;
    }

    _onClickContactList() {
        VContactListModal.show();
    }

    /**
     * VALIDATION METHODS
     */

    setButton() {
        this.$button.disabled = !this._isValid() || this._isLoading;
    }

    /**
     * @returns {nothing valuable} The return statement is just used for quitting the function early
     */
    async _validateField(field) {
        switch (field) {
            case 'recipient':
                this._validateRecipient();
                break;
            case 'sender':
                this._validateSender();
                // Fall through
            case 'amount':
                this._isSetMax = (this.$amountInput.value + this.$feeInput.value) === this.$accountsDropdown.selectedAccount.balance;
                // Fall through
            case 'fees':
                this._validateAmountAndFees();
                break;
            case 'validityStartHeight':
                this._validateValidityStartHeight();
                break;
        }

        return this.setButton();
    }

    _validateSender() {
        const account = this.$accountsDropdown.selectedAccount;

        // TODO FIXME Move this somewhere more reasonable
        if (account.type !== AccountType.KEYGUARD_HIGH && account.type !== AccountType.KEYGUARD_LOW) {
            this.$extraDataInput.value = '';
            this.$('.extra-data-section').classList.add('display-none');
        } else {
            this.$('.extra-data-section').classList.remove('display-none');
        }

        if (this.properties.hasConsensus) {
            this._validSender = !!(account && account.balance > 0);
            if (this._validSender) {
                this._clearError('sender');
            } else {
                this._setError(getString('account_has_no_balance'), 'sender');
            }
        }
        else {
            this._validSender = !!account;
        }

        this._validateRecipient(true);
    }

    _validateRecipient(forceValidate) {
        const address = this.$addressInput.value;
        const value = this.$addressInput.$input.value;

        if (value === this.__lastValidatedValue && !this.__validateRecipientTimeout && !forceValidate) return;
        this.__lastValidatedValue = value;

        clearTimeout(this.__validateRecipientTimeout);
        this.__validateRecipientTimeout = null;

        this._validRecipient = false;

        if (address === this.$accountsDropdown.selectedAccount.address) {
            this._setError(getString('same_address_as_sender'), 'recipient');
            return;
        }

        // TODO Skip network request when doing airgapped tx creation
        if (address) {
            if (!this.properties.hasConsensus) {
                if (Config.offline) {
                    this._setError(getString('cannot_validate_offline'), 'recipient');
                    this._validRecipient = true;
                } else {
                    this._setError(getString('cannot_validate'), 'recipient');
                    this.__validateRecipientTimeout = setInterval(this._validateRecipient.bind(this), 1000);
                    this._validRecipient = true;
                }
            } else {
                this.__debouncedValidateRecipient(address);
            }
        } else if (value.length === 0) {
            this._clearError('recipient');
        } else {
            this._setError(getString('invalid_address'), 'recipient');
        }
    }

    async __validateRecipient(address) {
        this._validatingRecipientTimeout = setTimeout(() => this._setError(getString('validating_address_type'), 'recipient'), 1000);

        const accountType = await (await networkClient.rpcClient).getAccountTypeString(address);

        this._validRecipient = (accountType === 'basic');

        clearTimeout(this._validatingRecipientTimeout);

        if (this._validRecipient) {
            this._clearError('recipient');
        } else {
            this._setError(getString('cannot_send_to_type'), 'recipient');
        }

        // Because this is a debounced async function, there is no external way
        // no know if this function finished, so we need to do that action in here
        this.setButton();
    }

    _validateAmountAndFees() {
        const account = this.$accountsDropdown.selectedAccount;

        const amount = this.$amountInput.value;
        const fees = this.$feeInput.value;

        if (amount < 0) {
            this._setError(getString('cannot_send_negative'), 'amount');
        }
        if (amount === 0) {
            this._clearError('amount');
        }

        if (amount <= 0 || fees < 0) {
            this._validAmountAndFees = false;
            return;
        }

        if (this.properties.hasConsensus) {
            this._validAmountAndFees = !!(account && account.balance >= Math.round((amount + fees) * 1e5) / 1e5);

            if (!this._validAmountAndFees) {
                this._setError(getString('cannot_send_funds'), 'amount');
            } else {
                this._clearError('amount');
            }
        }
        else {
            this._validAmountAndFees = true;
        }
    }

    _validateValidityStartHeight() {
        // TODO: Validate validityStartHeight?
        const value = this.$('input[validity-start]').value || 0;

        this._validValidityStartHeight = !!(value >= 0);

        if (this._validValidityStartHeight) {
            this._clearError('start-height');
        } else {
            this._setError('Cannot set a negative start height', 'start-height');
        }
    }

    _isValid() {
        // console.log(
        //     "sender", this._validSender,
        //     "recipient", this._validRecipient,
        //     "amountandFees", this._validAmountAndFees,
        //     "validityStartHeight", this._validValidityStartHeight
        // );
        return this._validSender && this._validRecipient && this._validAmountAndFees && this._validValidityStartHeight;
    }

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function(isDummy) {
                timeout = null;
                if (!isDummy) func.apply(context, args);
            };
            var callNow = !timeout;
            clearTimeout(timeout);
            if (callNow) {
                timeout = setTimeout(later, wait, true);
                func.apply(context, args);
            } else {
                timeout = setTimeout(later, wait);
            }
        }
    }

    _setError(msg, field) {
        let $el = this._errorElements[field];
        if (!$el) this._errorElements[field] = $el = this.$(`span[error][${field}]`);

        if (msg) {
            $el.textContent = msg;
            $el.classList.remove('display-none');
        } else {
            $el.classList.add('display-none');
        }
    }

    _clearError(field) {
        this._setError('', field);
    }
}

// TODO make validity start a slider
