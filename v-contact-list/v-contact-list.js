import XElement from '/libraries/x-element/x-element.js'
import MixinRedux from '/secure-elements/mixin-redux/mixin-redux.js'
import XSendTransactionModal from '/elements/x-send-transaction/x-send-transaction-modal.js'
import { spaceToDash } from '/libraries/nimiq-utils/parameter-encoding/parameter-encoding.js'
import { setContact, removeContact } from './contacts-redux.js'
import XPopupMenu from '/elements/x-popup-menu/x-popup-menu.js'
import XToast from '/secure-elements/x-toast/x-toast.js';
import BrowserDetection from '/libraries/secure-utils/browser-detection/browser-detection.js';
import ReduxProvider from '../node_modules/vuejs-redux/bundle.es.js';

export default class VContactList extends MixinRedux(XElement) {
    html() {
        return `
            <div class="header">
                <x-popup-menu left-align>
                    <button add><i class="material-icons">person_add</i> New contact</button>
                    <button manage><i class="material-icons">mode_edit</i> Manage contacts</button>
                    <button export><i class="material-icons">save</i> Export contacts</button>
                    <button import><i class="material-icons">insert_drive_file</i> Import contacts</button>
                </x-popup-menu>
                <h2>Contacts</h2>
                <i add class="material-icons">add</i>
            </div>
            <div class="body vue-contact-list">
                <!-- Vue template -->
                <redux-provider :map-state-to-props="mapStateToProps" :store="store">
                    <contact-list
                        slot-scope="{contacts}"
                        :contacts="contacts"
                        @select-contact="selectContact"
                        @set-contact="setContact"
                        @remove-contact="removeContact"
                        @notification="notification"
                        ref="contactList"
                    ></contact-list>
                </redux-provider>
                <!-- End Vue template -->
            </div>
        `
    }

    styles() {
        return [ ...super.styles(), 'v-contact-list' ];
    }

    children() { return [ XPopupMenu ] }

    static get actions() {
        return {
            setContact,
            removeContact,
        }
    }

    listeners() {
        return {
            'click button[add]': () => this.vue.$refs.contactList.addNewContact(),
            'click i[add]': () => this.vue.$refs.contactList.addNewContact(),
            'click button[manage]': () => this.vue.$refs.contactList.toggleManaging(),
            'click button[export]': () => this.vue.$refs.contactList.export(),
            'click button[import]': () => this.vue.$refs.contactList.import()
        }
    }

    onCreate() {
        super.onCreate();
        const self = this;

        if (BrowserDetection.isIOS()) this.$('button[export]').classList.add('display-none');

        this.vue = new Vue({
            el: this.$('.vue-contact-list'),
            data: {
                store: MixinRedux.store
            },
            methods: {
                mapStateToProps(state) {
                    return {
                        contacts: Object.values(state.contacts),
                    }
                },
                selectContact(address) {
                    self._onContactSelected(address)
                },
                setContact(label, address) {
                    self.actions.setContact(label, address)
                },
                removeContact(address) {
                    self.actions.removeContact(address)
                },
                notification(msg, type) {
                    XToast[type || 'show'](msg)
                },
            },
            components: {
                'redux-provider': ReduxProvider,
                'contact-list': NimiqVueComponents.ContactList,
            }
        })
    }

    _onContactSelected(address) {
        XSendTransactionModal.show(spaceToDash(address), 'contact')
    }
}
