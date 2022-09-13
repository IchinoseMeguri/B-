// ==UserScript==
// @name         B站成分检测器
// @version      1.12
// @author       xulaupuz,trychen
// @namespace    trychen.com
// @license      GPLv3
// @description  B站评论区自动标注成分，支持动态和关注识别，默认包括原神玩家和王者荣耀玩家
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/read/*
// @match        https://t.bilibili.com/*
// @icon         https://static.hdslb.com/images/favicon.ico
// @connect      bilibili.com
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/jquery@3.6.1/dist/jquery.min.js
// ==/UserScript==

$(function () {
    // 在这里配置要检查的成分
    const checkers = [
        {
            displayName: "[动态抽奖]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖", "抽奖"],
            followings: []
        },
        {
            displayName: "[米孝子]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["#米哈游#", "#miHoYo#"],
            followings: [318432901]
        },
        {
            displayName: "[月球人]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #命运冠位指定", "#命运冠位指定#"],
            followings: [233108841]
        },
        {
            displayName: "[原批]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #原神", "#原神#"],
            followings: [401742377] // 原神官方号的 UID
        },
        {
            displayName: "[绝批]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #绝区零", "#绝区零#"],
            followings: [1636034895] // 原神官方号的 UID
        },
        {
            displayName: "[穹批]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #崩坏星穹铁道", "#崩坏星穹铁道#"],
            followings: [1340190821] // 原神官方号的 UID
        },
        {
            displayName: "[粥批]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #明日方舟", "#明日方舟#", "#鹰角#"],
            followings: [161775300, 598504181, 1265652806] // 明日方舟官方号的 UID
        },
        {
            displayName: "[崩批]",
            //displayIcon: "https://i0.hdslb.com/bfs/face/f861b2ff49d2bb996ec5fd05ba7a1eeb320dbf7b.jpg@240w_240h_1c_1s.jpg",
            keywords: ["​互动抽奖 #崩坏3", "关注爱酱并转发本条动态"],
            followings: [256667467, 27534330, 133934] // 崩坏3官方号的 UID
        },
        {
            displayName: "[农批]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/effbafff589a27f02148d15bca7e97031a31d772.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #王者荣耀", "#王者荣耀#"],
            followings: [57863910, 392836434] // “王者荣耀” & “哔哩哔哩王者荣耀赛事”
        },
        {
            displayName: "[VTB|雏草姬]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d399d6f5cf7943a996ae96999ba3e6ae2a2988de.jpg@240w_240h_1c_1s.jpg",
            keywords: ["@永雏塔菲"],
            followings: [1265680561,]// 永雏塔菲
        }, {
            displayName: "[VTB|棺材板]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/d399d6f5cf7943a996ae96999ba3e6ae2a2988de.jpg@240w_240h_1c_1s.jpg",
            keywords: ["@東雪蓮Official"],
            followings: [1437582453,] // 東雪蓮Official
        },
        {
            displayName: "[VTB|A÷]",
            //displayIcon: "https://i2.hdslb.com/bfs/face/43b21998da8e7e210340333f46d4e2ae7ec046eb.jpg@240w_240h_1c_1s.jpg",
            keywords: ["@A-SOUL_Official", "#A_SOUL#", "@嘉然今天吃什么", "@乃琳Queen", "@珈乐Carol", "@向晚大魔王", "@贝拉kira"],
            followings: [
                703007996, // Asoul
                547510303, // Asoul二创计画
                672342685, // 乃琳Queen
                351609538, // 珈乐Carol
                672346917, // 向晚大魔王
                672353429, // 贝拉kira
                672328094, // 嘉然今天吃什么
            ]
        }
    ]

    // 空间动态api
    const spaceApiUrl = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?&host_mid='//空间
    const followingApiUrl = 'https://api.bilibili.com/x/relation/followings?vmid='//关注

    const checked = {}
    const checking = {}
    var printed = false

    // 监听用户ID元素出现
    waitForKeyElements(".user-name", installCheckButton);
    waitForKeyElements(".sub-user-name", installCheckButton);
    waitForKeyElements(".user .name", installCheckButton);
    waitForKeyElements("#h-name", installCheckButton);

    console.log("开启B站用户成分检查器...")

    // 添加检查按钮
    function installCheckButton(element) {
        let node = $(`<div style="display: inline;color: #6600CC" class="composition-checkable"><div class="composition-badge">
  <a class="composition-name">[查成分]</a>
</div></div>`)

        node.on('click', function () {
            node.find(".composition-name").text("检查中...")
            checkComposition(element, node.find(".composition-name"))
        })

        element.after(node)
    }

    // 添加标签
    function installComposition(id, element, setting) {
        let node = $(`<div style="display: inline;color: #6600CC"><div class="composition-badge">
  <a class="composition-name">${setting.displayName}</a>`
            /*+`<img src="${setting.displayIcon}" class="composition-icon">`*/
            + `</div></div>`)

        element.after(node)
    }

    // 检查标签
    function checkComposition(element, loadingElement) {
        // 用户ID
        let userID = element.attr("data-user-id") || element.attr("data-usercard-mid")
        // 用户名
        let name = element.text().charAt(0) == "@" ? element.text().substring(1) : element.text()

        if (checked[userID] != undefined) {
            // 已经缓存过了
            let found = checked[userID]
            if (found.length > 0) {
                for (let setting of found) {
                    installComposition(userID, element, setting)
                }
                loadingElement.parent().remove()
            } else {
                loadingElement.text('一般用户')
            }
        } else if (checking[userID] != undefined) {
            // 检查中
            if (checking[userID].indexOf(element) < 0)
                checking[userID].push(element)
        } else {
            checking[userID] = [element]
            console.log("正在检查用户 " + name + " 的成分...");

            new Promise(async (resolve, reject) => {
                try {
                    // 找到的匹配内容
                    let found = []

                    let spaceRequest = request({
                        data: "",
                        url: spaceApiUrl + userID,
                    })

                    let followingRequest = request({
                        data: "",
                        url: followingApiUrl + userID,
                    })

                    try {
                        let spaceContent = await spaceRequest

                        if (!printed) {
                            console.log(spaceContent)
                            printed = true
                        }

                        // 动态内容检查
                        if (spaceContent.code == 0) {
                            // 解析并拼接动态数据
                            let st = JSON.stringify(spaceContent.data.items)

                            for (let setting of checkers) {
                                // 检查动态内容
                                if (setting.keywords) {
                                    if (setting.keywords.find(keyword => st.includes(keyword))) {
                                        if (found.indexOf(setting) < 0)
                                            found.push(setting)
                                        continue;
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`获取 ${name} ${userID} 的动态失败`, error)
                    }

                    try {
                        let followingContent = await followingRequest

                        // 可能无权限
                        let following = followingContent.code == 0 ? followingContent.data.list.map(it => it.mid) : []
                        if (following) {
                            for (let setting of checkers) {
                                // 检查关注列表
                                if (setting.followings)
                                    for (let mid of setting.followings) {
                                        if (following.indexOf(mid) >= 0) {
                                            if (found.indexOf(setting) < 0)
                                                found.push(setting)
                                            continue;
                                        }
                                    }
                            }
                        }
                    } catch (error) {
                        console.error(`获取 ${name} ${userID} 的关注列表失败`, error)
                    }

                    // 添加标签
                    if (found.length > 0) {
                        // 输出日志
                        console.log(`检测到 ${name} ${userID} 的成分为 `, found.map(it => it.displayName))

                        checked[userID] = found

                        // 给所有用到的地方添加标签
                        for (let element of checking[userID]) {
                            for (let setting of found) {
                                installComposition(userID, element, setting)
                            }
                        }
                        loadingElement.parent().remove()
                    } else {
                        loadingElement.text('一般用户')
                    }

                    checked[userID] = found
                    delete checking[userID]

                    resolve(found)
                } catch (error) {
                    console.error(`检测 ${name} ${userID} 的成分失败`, error)
                    loadingElement.text('失败')
                    delete checking[userID]
                    reject(error)
                }
            })
        }
    }

    // 添加标签样式
    addGlobalStyle(`
.composition-badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  background: #00000000;
  border-radius: 10px;
  margin: -6px 0;
  margin: 0 5px;
  font-family: HarmonyOS_Regular, Helvetica Neue, Microsoft YaHei, sans-serif;
}
.composition-name {
  line-height: 13px;
  font-size: 10px;
  color: #6600CC;
  padding: 2px 8px;
}
.composition-icon {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 2px solid white;
  margin: -6px;
  margin-right: 5px;
}
    `)

    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    function request(option) {
        return new Promise((resolve, reject) => {
            let requestFunction = GM_xmlhttpRequest ? GM_xmlhttpRequest : GM.xmlHttpRequest

            requestFunction({
                method: "get",
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
                },
                ...option,
                onload: (response) => {
                    let res = JSON.parse(response.responseText)
                    resolve(res)
                },
                onerror: (error) => {
                    reject(error);
                }
            });
        })
    }

    /*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.
    Usage example:
        waitForKeyElements (
            "div.comments"
            , commentCallbackFunction
        );
        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction (jNode) {
            jNode.text ("This comment changed by waitForKeyElements().");
        }
    IMPORTANT: This function requires your script to have loaded jQuery.
    */
    function waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector) {
        var targetNodes, btargetsFound;

        if (typeof iframeSelector == "undefined")
            targetNodes = $(selectorTxt);
        else
            targetNodes = $(iframeSelector).contents()
                .find(selectorTxt);

        if (targetNodes && targetNodes.length > 0) {
            btargetsFound = true;
            targetNodes.each(function () {
                var jThis = $(this);
                var alreadyFound = jThis.data('alreadyFound') || false;

                if (!alreadyFound) {
                    //--- Call the payload function.
                    var cancelFound = actionFunction(jThis);
                    if (cancelFound) btargetsFound = false;
                    else jThis.data('alreadyFound', true);
                }
            });
        } else {
            btargetsFound = false;
        }

        //--- Get the timer-control variable for this selector.
        var controlObj = waitForKeyElements.controlObj || {};
        var controlKey = selectorTxt.replace(/[^\w]/g, "_");
        var timeControl = controlObj[controlKey];

        //--- Now set or clear the timer as appropriate.
        if (btargetsFound && bWaitOnce && timeControl) {
            //--- The only condition where we need to clear the timer.
            clearInterval(timeControl);
            delete controlObj[controlKey]
        } else {
            //--- Set a timer, if needed.
            if (!timeControl) {
                timeControl = setInterval(function () {
                    waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
                }, 300);
                controlObj[controlKey] = timeControl;
            }
        }
        waitForKeyElements.controlObj = controlObj;
    }
})
