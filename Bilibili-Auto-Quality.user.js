// ==UserScript==
// @name         哔哩哔哩自动画质
// @namespace    https://github.com/AHCorn/Bilibili-Auto-Quality/
// @version      2.0.1
// @description  自动解锁并更改哔哩哔哩视频的画质和音质，实现自动选择最高画质及无损音频。
// @author       安和（AHCorn）
// @icon         https://www.bilibili.com/favicon.ico
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/list/*
// @match        *://www.bilibili.com/blackboard/*
// @match        *://www.bilibili.com/watchlater/*
// @match        *://www.bilibili.com/bangumi/*
// @match        *://www.bilibili.com/watchroom/*
// @match        *://www.bilibili.com/medialist/*
// @match        *://bangumi.bilibili.com/*
// @match        *://live.bilibili.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    Object.defineProperty(navigator, 'userAgent', {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
    });

    window.localStorage['bilibili_player_force_DolbyAtmos&8K&HDR'] = 1;

    GM_addStyle(`
        #bilibili-quality-selector {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f8f8f8;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            display: none;
            z-index: 10000;
            width: 300px;
            text-align: center;
            border: 1px solid #ddd;
        }
        #bilibili-quality-selector button {
            display: block;
            width: 90%;
            margin: 5px auto;
            padding: 10px;
            border: 1px solid #007bff;
            border-radius: 5px;
            background-color: white;
            color: #007bff;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        #bilibili-quality-selector button.active {
            background-color: #007bff;
            color: white;
        }
        #bilibili-quality-selector button:hover {
            background-color: #0056b3;
            color: white;
        }
        #bilibili-quality-selector button.active:hover {
            background-color: #003f7f;
        }
    `);

    let hiResAudioEnabled = GM_getValue('hiResAudio', false);
    let userQualitySetting = GM_getValue('qualitySetting', ' 自动选择最高画质 ');
    let userHasChangedQuality = false;

    function isVipUser() {
        return document.querySelector('.bili-avatar-icon.bili-avatar-right-icon.bili-avatar-icon-big-vip') !== null;
    }

    function selectQualityBasedOnSetting() {
        if (userHasChangedQuality) return;

        const isVip = isVipUser();
        const qualityItems = document.querySelectorAll('.bpx-player-ctrl-quality-menu .bpx-player-ctrl-quality-menu-item');
        let preferredQuality = null;
        let qualityFound = false;

        const qualityPreferences = ['8K', '4K', '1080P 高码率', '1080P 60 帧', '1080P', '720P 60 帧', '720P', '480P', '360P'];
        let userQualityIndex = qualityPreferences.indexOf(userQualitySetting);

        if (userQualitySetting !== ' 自动选择最高画质 ') {
            for (let item of qualityItems) {
                const qualityText = item.textContent.trim();
                const isVipQuality = item.querySelector('.bpx-player-ctrl-quality-badge-bigvip') !== null;

                if (qualityText.startsWith(userQualitySetting) && (isVip || !isVipQuality)) {
                    preferredQuality = item;
                    qualityFound = true;
                    break;
                }
            }
        }

        if (!qualityFound) {
            userQualityIndex = Math.max(userQualityIndex, 0);
            while (userQualityIndex < qualityPreferences.length) {
                const nextQuality = qualityPreferences[userQualityIndex++];
                preferredQuality = Array.from(qualityItems).find(item => item.textContent.trim().startsWith(nextQuality) && (isVip || !item.querySelector('.bpx-player-ctrl-quality-badge-bigvip')));
                if (preferredQuality) break;
            }
        }

        preferredQuality?.click();

        const hiResButton = document.querySelector('.bpx-player-ctrl-flac');
        if (hiResButton) {
            if (isVip) {
                if (hiResAudioEnabled && !hiResButton.classList.contains('bpx-state-active')) {
                    hiResButton.click();
                } else if (!hiResAudioEnabled && hiResButton.classList.contains('bpx-state-active')) {
                    hiResButton.click();
                }
            } else {
                if (hiResButton.classList.contains('bpx-state-active')) {
                    hiResButton.click();
                }
            }
        }
    }

    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'bilibili-quality-selector';

        const QUALITIES = [' 自动选择最高画质 ', '8K', '4K', '1080P 高码率', '1080P 60 帧', '1080P', '720P', '480P', '360P'];
        QUALITIES.forEach(quality => {
            const button = document.createElement('button');
            button.textContent = quality;
            button.onclick = () => {
                userQualitySetting = quality;
                GM_setValue('qualitySetting', quality);
                userHasChangedQuality = true;
                updateQualityButtons(panel);
                selectQualityBasedOnSetting();
            };
            panel.appendChild(button);
        });

        const hiResButton = document.createElement('button');
        hiResButton.textContent = 'Hi-Res 音质';
        hiResButton.onclick = () => {
            hiResAudioEnabled = !hiResAudioEnabled;
            GM_setValue('hiResAudio', hiResAudioEnabled);
            updateQualityButtons(panel);
            selectQualityBasedOnSetting();
        };
        panel.appendChild(hiResButton);

        updateQualityButtons(panel);
        document.body.appendChild(panel);
    }

    function updateQualityButtons(panel) {
        panel.querySelectorAll('button').forEach(button => {
            button.classList.remove('active');
            if (button.textContent === userQualitySetting || (button.textContent === 'Hi-Res 音质' && hiResAudioEnabled)) {
                button.classList.add('active');
            }
        });
    }

    function toggleSettingsPanel() {
        let panel = document.getElementById('bilibili-quality-selector');
        if (!panel) {
            createSettingsPanel();
            panel = document.getElementById('bilibili-quality-selector');
        }
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    }

    document.addEventListener('mousedown', function (event) {
        const panel = document.getElementById('bilibili-quality-selector');
        if (panel && !panel.contains(event.target)) {
            panel.style.display = 'none';
        }
    });

    GM_registerMenuCommand("设置画质和音质", toggleSettingsPanel);

const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;

const thresholds = [
    { threshold: 3000, delay: 3000 },
    { threshold: 5000, delay: 4000 },
    { threshold: 8000, delay: 7000 }
];

let delay = 15000; // 默认等待15秒

for (const threshold of thresholds) {
    if (loadTime < threshold.threshold) {
        delay = threshold.delay;
        break;
    }
}

setTimeout(selectQualityBasedOnSetting, delay);

})();
