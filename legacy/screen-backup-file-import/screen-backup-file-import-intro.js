import XWalletBackupImport from '../../x-wallet-backup-import/x-wallet-backup-import.js';
import XScreenFit from '../../x-screen/x-screen-fit.js';

export default class ScreenBackupFileImportIntro extends XScreenFit {
    html() {
        return `
            <h2 secondary>Select your Access File or drag it onto the page.</h2>
            <x-wallet-backup-import></x-wallet-backup-import>
        `
    }

    get route() { return 'intro' }

    children() { return [XWalletBackupImport] }
}