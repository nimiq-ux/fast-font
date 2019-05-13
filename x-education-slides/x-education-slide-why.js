import XEducationSlide from './x-education-slide.js';

export default class XEducationSlideWhy extends XEducationSlide {
    html() {
        return `
            <h1 class="modal-header">
                Why are you making me read all this?
                <i x-modal-close class="material-icons">close</i>
            </h1>
            <div class="modal-body">
                <div class="has-side-image">
                    <div class="side-image-why"></div>
                    <div>
                        <h3>Because we need you to understand that we cannot...</h3>
                        <ul class="important">
                            <li>Access your account or send your funds for you.</li>
                            <li>Recover or change your private key or 24 Recovery Words.</li>
                            <li>Recover or reset your Pass Phrase or PIN.</li>
                            <li>Reverse, cancel, or refund transactions.</li>
                            <li>Freeze accounts.</li>
                        </ul>

                        <h3><strong>You</strong> and <strong>only you</strong> are responsible for your security.</h3>
                        <ul>
                            <li>Be diligent to keep your private key and associated 24 Recovery Words, Account Access File and Pass Phrase safe.</li>
                            <li>If you lose your private key (24 Recovery Words), Pass Phrase or PIN, no one can recover it.</li>
                            <li>If you enter your private key (24 Recovery Words) on a phishing website, you will have <strong>all your funds taken</strong>.</li>
                        </ul>
                    </div>
                </div>

                <div class="button-bar">
                    <button back>What is a Blockchain?</button>
                    <button next>So what's the point?</button>
                </div>
            </div>
        `;
    }
}
