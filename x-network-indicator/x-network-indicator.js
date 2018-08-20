import XElement from '/libraries/x-element/x-element.js';
import MixinRedux from '/secure-elements/mixin-redux/mixin-redux.js';
import Config from '/libraries/secure-utils/config/config.js';
import { getString } from '../strings.js';

export default class XNetworkIndicator extends MixinRedux(XElement) {
    html() {
        return `
            <div><label>${getString('network_status_consensus')}</label> <span consensus></span></div>
            <div><label>${getString('network_status_peers')}</label> <span peerCount></span></div>
            <div><label>${getString('network_status_height')}</label> <span height></span></div>
            <div><label>${getString('network_status_hashrate')}</label> <span globalHashrate></span></div>
        `;
    }

    onCreate() {
        this.$consensus = this.$('span[consensus]');
        this.$height = this.$('span[height]');
        this.$peerCount = this.$('span[peerCount]');
        this.$globalHashrate = this.$('span[globalHashrate]');
        super.onCreate();
    }

    static mapStateToProps(state) {
        return state.network
    }

    _onPropertiesChanged(changes) {
        for (const prop in changes) {
            this[prop] = changes[prop];
        }
    }

    set consensus(consensus) {
        this.$consensus.textContent = consensus;
        if (Config.offline) this.$consensus.textContent = 'offline';
    }

    set height(height) {
        this.$height.textContent = `#${height}`;
        if (Config.offline) this.$height.textContent = '-';
    }

    set peerCount(peerCount) {
        this.$peerCount.textContent = peerCount;
        if (Config.offline) this.$peerCount.textContent = '-';
    }

    set globalHashrate(globalHashrate) {
        this.$globalHashrate.textContent = this._formatHashrate(globalHashrate);
        if (Config.offline) this.$globalHashrate.textContent = '-';
    }

    _formatHashrate(hashrate) {
        // kilo, mega, giga, tera, peta, exa, zetta
        const unit_prefix = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z'];

        for (let i = 0; i < unit_prefix.length - 1; i++) {
            if (hashrate < 1000) return `${hashrate.toFixed(2)} ${unit_prefix[i]}H/s`;
            hashrate = hashrate / 1000;
        }

        throw new Error('Hashrate higher than 1000 ZH/s');
    }
}
