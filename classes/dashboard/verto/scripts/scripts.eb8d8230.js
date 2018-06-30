function createAudioMeter(a, b, c, d) {
    var e = a.createScriptProcessor(512);
    return e.onaudioprocess = volumeAudioProcess, e.clipping = !1, e.lastClip = 0, e.volume = 0, e.clipLevel = b || .98, e.averaging = c || .95, e.clipLag = d || 750, e.connect(a.destination), e.checkClipping = function() {
        return this.clipping ? (this.lastClip + this.clipLag < window.performance.now() && (this.clipping = !1), this.clipping) : !1
    }, e.shutdown = function() {
        this.disconnect(), this.onaudioprocess = null
    }, e
}

function volumeAudioProcess(a) {
    for (var b, c = a.inputBuffer.getChannelData(0), d = c.length, e = 0, f = 0; d > f; f++) b = c[f], Math.abs(b) >= this.clipLevel && (this.clipping = !0, this.lastClip = window.performance.now()), e += b * b;
    var g = Math.sqrt(e / d);
    this.volume = Math.max(g, this.volume * this.averaging)
}! function(a) {
    a.JsonRpcClient = function(b) {
        var c = this;
        this.options = a.extend({
            ajaxUrl: null,
            socketUrl: null,
            onmessage: null,
            login: null,
            passwd: null,
            sessid: null,
            loginParams: null,
            userVariables: null,
            getSocket: function(a) {
                return c._getSocket(a)
            }
        }, b), c.ws_cnt = 0, this.wsOnMessage = function(a) {
            c._wsOnMessage(a)
        }
    }, a.JsonRpcClient.prototype._ws_socket = null, a.JsonRpcClient.prototype._ws_callbacks = {}, a.JsonRpcClient.prototype._current_id = 1, a.JsonRpcClient.prototype.speedTest = function(a, b) {
        var c = this.options.getSocket(this.wsOnMessage);
        if (null !== c) {
            this.speedCB = b, this.speedBytes = a, c.send("#SPU " + a);
            var d, e = a / 1024,
                f = a % 1024,
                g = new Array(1024).join(".");
            for (d = 0; e > d; d++) c.send("#SPB " + g);
            f && c.send("#SPB " + g), c.send("#SPE")
        }
    }, a.JsonRpcClient.prototype.call = function(b, c, d, e) {
        c || (c = {}), this.options.sessid && (c.sessid = this.options.sessid);
        var f = {
            jsonrpc: "2.0",
            method: b,
            params: c,
            id: this._current_id++
        };
        d || (d = function(a) {
            console.log("Success: ", a)
        }), e || (e = function(a) {
            console.log("Error: ", a)
        });
        var g = this.options.getSocket(this.wsOnMessage);
        if (null !== g) return void this._wsCall(g, f, d, e);
        if (null === this.options.ajaxUrl) throw "$.JsonRpcClient.call used with no websocket and no http endpoint.";
        a.ajax({
            type: "POST",
            url: this.options.ajaxUrl,
            data: a.toJSON(f),
            dataType: "json",
            cache: !1,
            success: function(a) {
                "error" in a && e(a.error, this), d(a.result, this)
            },
            error: function(b, c, d) {
                try {
                    var f = a.parseJSON(b.responseText);
                    "console" in window && console.log(f), e(f.error, this)
                } catch (g) {
                    e({
                        error: b.responseText
                    }, this)
                }
            }
        })
    }, a.JsonRpcClient.prototype.notify = function(b, c) {
        this.options.sessid && (c.sessid = this.options.sessid);
        var d = {
                jsonrpc: "2.0",
                method: b,
                params: c
            },
            e = this.options.getSocket(this.wsOnMessage);
        if (null !== e) return void this._wsCall(e, d);
        if (null === this.options.ajaxUrl) throw "$.JsonRpcClient.notify used with no websocket and no http endpoint.";
        a.ajax({
            type: "POST",
            url: this.options.ajaxUrl,
            data: a.toJSON(d),
            dataType: "json",
            cache: !1
        })
    }, a.JsonRpcClient.prototype.batch = function(b, c, d) {
        var e = new a.JsonRpcClient._batchObject(this, c, d);
        b(e), e._execute()
    }, a.JsonRpcClient.prototype.socketReady = function() {
        return null === this._ws_socket || this._ws_socket.readyState > 1 ? !1 : !0
    }, a.JsonRpcClient.prototype.closeSocket = function() {
        var a = this;
        a.socketReady() && (a._ws_socket.onclose = function(a) {
            console.log("Closing Socket")
        }, a._ws_socket.close())
    }, a.JsonRpcClient.prototype.loginData = function(a) {
        var b = this;
        b.options.login = a.login, b.options.passwd = a.passwd, b.options.loginParams = a.loginParams, b.options.userVariables = a.userVariables
    }, a.JsonRpcClient.prototype.connectSocket = function(b) {
        var c = this;
        return c.to && clearTimeout(c.to), c.socketReady() || (c.authing = !1, c._ws_socket && delete c._ws_socket, c._ws_socket = new WebSocket(c.options.socketUrl, "verto"), c._ws_socket && (c._ws_socket.onmessage = b, c._ws_socket.onclose = function(a) {
            c.ws_sleep || (c.ws_sleep = 1e3), c.options.onWSClose && c.options.onWSClose(c), console.error("Websocket Lost " + c.ws_cnt + " sleep: " + c.ws_sleep + "msec"), c.to = setTimeout(function() {
                console.log("Attempting Reconnection...."), c.connectSocket(b)
            }, c.ws_sleep), c.ws_cnt++, c.ws_sleep < 3e3 && c.ws_cnt % 10 === 0 && (c.ws_sleep += 1e3)
        }, c._ws_socket.onopen = function() {
            c.to && clearTimeout(c.to), c.ws_sleep = 1e3, c.ws_cnt = 0, c.options.onWSConnect && c.options.onWSConnect(c);
            for (var b; b = a.JsonRpcClient.q.pop();) c._ws_socket.send(b)
        })), c._ws_socket ? !0 : !1
    }, a.JsonRpcClient.prototype.stopRetrying = function() {
        self.to && clearTimeout(self.to)
    }, a.JsonRpcClient.prototype._getSocket = function(a) {
        return null !== this.options.socketUrl && "WebSocket" in window ? (this.connectSocket(a), this._ws_socket) : null
    }, a.JsonRpcClient.q = [], a.JsonRpcClient.prototype._wsCall = function(b, c, d, e) {
        var f = a.toJSON(c);
        b.readyState < 1 ? (self = this, a.JsonRpcClient.q.push(f)) : b.send(f), "id" in c && "undefined" != typeof d && (this._ws_callbacks[c.id] = {
            request: f,
            request_obj: c,
            success_cb: d,
            error_cb: e
        })
    }, a.JsonRpcClient.prototype._wsOnMessage = function(b) {
        var c;
        if ("#" != b.data[0] || "S" != b.data[1] || "P" != b.data[2]) {
            try {
                if (c = a.parseJSON(b.data), "object" == typeof c && "jsonrpc" in c && "2.0" === c.jsonrpc) {
                    if ("result" in c && this._ws_callbacks[c.id]) {
                        var d = this._ws_callbacks[c.id].success_cb;
                        return delete this._ws_callbacks[c.id], void d(c.result, this)
                    }
                    if ("error" in c && this._ws_callbacks[c.id]) {
                        var e = this._ws_callbacks[c.id].error_cb,
                            f = this._ws_callbacks[c.id].request;
                        return !self.authing && -32e3 == c.error.code && self.options.login && self.options.passwd ? (self.authing = !0, void this.call("login", {
                            login: self.options.login,
                            passwd: self.options.passwd,
                            loginParams: self.options.loginParams,
                            userVariables: self.options.userVariables
                        }, "login" == this._ws_callbacks[c.id].request_obj.method ? function(a) {
                            self.authing = !1, console.log("logged in"), delete self._ws_callbacks[c.id], self.options.onWSLogin && self.options.onWSLogin(!0, self)
                        } : function(a) {
                            self.authing = !1, console.log("logged in, resending request id: " + c.id);
                            var b = self.options.getSocket(self.wsOnMessage);
                            null !== b && b.send(f), self.options.onWSLogin && self.options.onWSLogin(!0, self)
                        }, function(a) {
                            console.log("error logging in, request id:", c.id), delete self._ws_callbacks[c.id], e(c.error, this), self.options.onWSLogin && self.options.onWSLogin(!1, self)
                        })) : (delete this._ws_callbacks[c.id], void e(c.error, this))
                    }
                }
            } catch (g) {
                return void console.log("ERROR: " + g)
            }
            if ("function" == typeof this.options.onmessage) {
                b.eventData = c, b.eventData || (b.eventData = {});
                var h = this.options.onmessage(b);
                if (h && "object" == typeof h && b.eventData.id) {
                    var i = {
                            jsonrpc: "2.0",
                            id: b.eventData.id,
                            result: h
                        },
                        j = self.options.getSocket(self.wsOnMessage);
                    null !== j && j.send(a.toJSON(i))
                }
            }
        } else if ("U" == b.data[3]) this.up_dur = parseInt(b.data.substring(4));
        else if (this.speedCB && "D" == b.data[3]) {
            this.down_dur = parseInt(b.data.substring(4));
            var k = (8 * this.speedBytes / (this.up_dur / 1e3) / 1024).toFixed(0),
                l = (8 * this.speedBytes / (this.down_dur / 1e3) / 1024).toFixed(0);
            console.info("Speed Test: Up: " + k + " Down: " + l), this.speedCB(b, {
                upDur: this.up_dur,
                downDur: this.down_dur,
                upKPS: k,
                downKPS: l
            }), this.speedCB = null
        }
    }, a.JsonRpcClient._batchObject = function(a, b, c) {
        this._requests = [], this.jsonrpcclient = a, this.all_done_cb = b, this.error_cb = "function" == typeof c ? c : function() {}
    }, a.JsonRpcClient._batchObject.prototype.call = function(a, b, c, d) {
        b || (b = {}), this.options.sessid && (b.sessid = this.options.sessid), c || (c = function(a) {
            console.log("Success: ", a)
        }), d || (d = function(a) {
            console.log("Error: ", a)
        }), this._requests.push({
            request: {
                jsonrpc: "2.0",
                method: a,
                params: b,
                id: this.jsonrpcclient._current_id++
            },
            success_cb: c,
            error_cb: d
        })
    }, a.JsonRpcClient._batchObject.prototype.notify = function(a, b) {
        this.options.sessid && (b.sessid = this.options.sessid), this._requests.push({
            request: {
                jsonrpc: "2.0",
                method: a,
                params: b
            }
        })
    }, a.JsonRpcClient._batchObject.prototype._execute = function() {
        var b = this;
        if (0 !== this._requests.length) {
            var c, d, e, f = [],
                g = {},
                h = 0,
                i = b.jsonrpcclient.options.getSocket(b.jsonrpcclient.wsOnMessage);
            if (null !== i) {
                for (h = 0; h < this._requests.length; h++) c = this._requests[h], d = "success_cb" in c ? c.success_cb : void 0, e = "error_cb" in c ? c.error_cb : void 0, b.jsonrpcclient._wsCall(i, c.request, d, e);
                return void("function" == typeof all_done_cb && all_done_cb(result))
            }
            for (h = 0; h < this._requests.length; h++) c = this._requests[h], f.push(c.request), "id" in c.request && (g[c.request.id] = {
                success_cb: c.success_cb,
                error_cb: c.error_cb
            });
            if (d = function(a) {
                    b._batchCb(a, g, b.all_done_cb)
                }, null === b.jsonrpcclient.options.ajaxUrl) throw "$.JsonRpcClient.batch used with no websocket and no http endpoint.";
            a.ajax({
                url: b.jsonrpcclient.options.ajaxUrl,
                data: a.toJSON(f),
                dataType: "json",
                cache: !1,
                type: "POST",
                error: function(a, c, d) {
                    b.error_cb(a, c, d)
                },
                success: d
            })
        }
    }, a.JsonRpcClient._batchObject.prototype._batchCb = function(a, b, c) {
        for (var d = 0; d < a.length; d++) {
            var e = a[d];
            "error" in e ? null !== e.id && e.id in b ? b[e.id].error_cb(e.error, this) : "console" in window && console.log(e) : !(e.id in b) && "console" in window ? console.log(e) : b[e.id].success_cb(e.result, this)
        }
        "function" == typeof c && c(a)
    }
}(jQuery),
function(a) {
    function b(a, b, d) {
        return c(a, 0, -1, b, d)
    }

    function c(a, b, c, d, e) {
        for (var f = -1 != c ? c : a.length, g = b; f > g; ++g)
            if (0 === a[g].indexOf(d) && (!e || -1 !== a[g].toLowerCase().indexOf(e.toLowerCase()))) return g;
        return null
    }

    function d(a) {
        var b = new RegExp("a=rtpmap:(\\d+) \\w+\\/\\d+"),
            c = a.match(b);
        return c && 2 == c.length ? c[1] : null
    }

    function e() {}

    function f() {
        return !0
    }

    function g(a, b) {
        console.log("There has been a problem retrieving the streams - did you allow access? Check Device Resolution", b), k(a, "onError", b)
    }

    function i(a, b) {
        console.log("Stream Success"), k(a, "onStream", b)
    }

    function j(a, b) {
        a.mediaData.candidate = b, a.mediaData.candidateList.push(a.mediaData.candidate), k(a, "onICE")
    }

    function k(a, b, c) {
        b in a.options.callbacks && a.options.callbacks[b](a, c)
    }

    function l(a, b) {
        console.log("ICE Complete"), k(a, "onICEComplete")
    }

    function m(a, b) {
        console.error("Channel Error", b), k(a, "onError", b)
    }

    function n(a, b) {
        a.mediaData.SDP = a.stereoHack(b.sdp), console.log("ICE SDP"), k(a, "onICESDP")
    }

    function o(a, b) {
        if (a.options.useVideo) {
            a.options.useVideo.style.display = "block";
            var c = ["iPad", "iPhone", "iPod"].indexOf(navigator.platform) >= 0;
            c && (a.options.useVideo.setAttribute("playsinline", !0), a.options.useVideo.setAttribute("controls", !0))
        }
        var d = a.options.useAudio;
        console.log("REMOTE STREAM", b, d), FSRTCattachMediaStream(d, b), a.remoteStream = b
    }

    function p(a, b) {
        a.mediaData.SDP = a.stereoHack(b.sdp), console.log("Offer SDP"), k(a, "onOfferSDP")
    }

    function q(a) {
        var b;
        a.options.useMic && "none" === a.options.useMic ? (console.log("Microphone Disabled"), b = !1) : a.options.videoParams && a.options.screenShare ? (console.error("SCREEN SHARE", a.options.videoParams), b = !1) : (b = {}, a.options.audioParams && (b = a.options.audioParams), "any" !== a.options.useMic && (b.deviceId = {
            exact: a.options.useMic
        })), a.options.useVideo && a.options.localVideo && s({
            constraints: {
                audio: !1,
                video: a.options.videoParams
            },
            localVideo: a.options.localVideo,
            onsuccess: function(a) {
                self.options.localVideoStream = a, console.log("local video ready")
            },
            onerror: function(a) {
                console.error("local video error!")
            }
        });
        var c = {},
            d = a.options.videoParams.vertoBestFrameRate,
            e = a.options.videoParams.minFrameRate || 15;
        if (delete a.options.videoParams.vertoBestFrameRate, a.options.screenShare)
            if (!a.options.useCamera && navigator.mozGetUserMedia) {
                var f = window.confirm("Do you want to share an application window?  If not you can share an entire screen.");
                c = {
                    width: {
                        min: a.options.videoParams.minWidth,
                        max: a.options.videoParams.maxWidth
                    },
                    height: {
                        min: a.options.videoParams.minHeight,
                        max: a.options.videoParams.maxHeight
                    },
                    mediaSource: f ? "window" : "screen"
                }
            } else {
                var g = [];
                a.options.useCamera && g.push({
                    sourceId: a.options.useCamera
                }), d && (g.push({
                    minFrameRate: d
                }), g.push({
                    maxFrameRate: d
                })), c = {
                    mandatory: a.options.videoParams,
                    optional: g
                }
            }
        else {
            c = {
                width: {
                    min: a.options.videoParams.minWidth,
                    max: a.options.videoParams.maxWidth
                },
                height: {
                    min: a.options.videoParams.minHeight,
                    max: a.options.videoParams.maxHeight
                }
            };
            var h = a.options.useVideo;
            h && a.options.useCamera && "none" !== a.options.useCamera ? ("any" !== a.options.useCamera && (c.deviceId = a.options.useCamera), d && (c.frameRate = {
                ideal: d,
                min: e,
                max: 30
            })) : (console.log("Camera Disabled"), c = !1, h = !1)
        }
        return {
            audio: b,
            video: c,
            useVideo: h
        }
    }

    function r(a) {
        function b() {
            l = !0, k = null, a.onICEComplete && a.onICEComplete(), "offer" == a.type ? a.onICESDP(o.localDescription) : !p && a.onICESDP && a.onICESDP(o.localDescription)
        }

        function c() {
            a.onOfferSDP && o.createOffer(function(b) {
                b.sdp = e(b.sdp), o.setLocalDescription(b), a.onOfferSDP(b)
            }, j, a.constraints)
        }

        function d() {
            "answer" == a.type && (o.setRemoteDescription(new window.RTCSessionDescription(a.offerSDP), i, j), o.createAnswer(function(b) {
                b.sdp = e(b.sdp), o.setLocalDescription(b), a.onAnswerSDP && a.onAnswerSDP(b)
            }, j))
        }

        function e(a) {
            return a
        }

        function f() {
            a.onChannelMessage && g()
        }

        function g() {
            s = o.createDataChannel(a.channel || "RTCDataChannel", {
                reliable: !1
            }), h()
        }

        function h() {
            s.onmessage = function(b) {
                a.onChannelMessage && a.onChannelMessage(b)
            }, s.onopen = function() {
                a.onChannelOpened && a.onChannelOpened(s)
            }, s.onclose = function(b) {
                a.onChannelClosed && a.onChannelClosed(b), console.warn("WebRTC DataChannel closed", b)
            }, s.onerror = function(b) {
                a.onChannelError && a.onChannelError(b), console.error("WebRTC DataChannel error", b)
            }
        }

        function i() {}

        function j(b) {
            a.onChannelError && a.onChannelError(b), console.error("sdp error:", b)
        }
        var k = !1,
            l = !1,
            m = {},
            n = {
                urls: ["stun:stun.l.google.com:19302"]
            };
        a.iceServers && ("boolean" == typeof a.iceServers ? m.iceServers = [n] : m.iceServers = a.iceServers);
        var o = new window.RTCPeerConnection(m);
        f();
        var p = 0;
        if (o.onicecandidate = function(c) {
                l || (k || (k = setTimeout(b, 1e3)), c ? c.candidate && a.onICE(c.candidate) : (l = !0, k && (clearTimeout(k), k = null), b()))
            }, a.attachStream && o.addStream(a.attachStream), a.attachStreams && a.attachStream.length)
            for (var q = a.attachStreams, r = 0; r < q.length; r++) o.addStream(q[r]);
        o.onaddstream = function(b) {
            var c = b.stream;
            c.oninactive = function() {
                a.onRemoteStreamEnded && a.onRemoteStreamEnded(c)
            }, a.onRemoteStream && a.onRemoteStream(c)
        }, (a.onChannelMessage || !a.onChannelMessage) && (c(), d());
        var s;
        return {
            addAnswerSDP: function(a, b, c) {
                o.setRemoteDescription(new window.RTCSessionDescription(a), b ? b : i, c ? c : j)
            },
            addICE: function(a) {
                o.addIceCandidate(new window.RTCIceCandidate({
                    sdpMLineIndex: a.sdpMLineIndex,
                    candidate: a.candidate
                }))
            },
            peer: o,
            channel: s,
            sendData: function(a) {
                s && s.send(a)
            },
            stop: function() {
                o.close(), a.attachStream && ("function" == typeof a.attachStream.stop ? a.attachStream.stop() : a.attachStream.active = !1)
            }
        }
    }

    function s(a) {
        function b(b) {
            a.localVideo && (a.localVideo.src = window.URL.createObjectURL(b), a.localVideo.style.display = "block"), a.onsuccess && a.onsuccess(b), c = b
        }
        var c, d = navigator;
        return d.getMedia = d.getUserMedia, d.getMedia(a.constraints || {
            audio: !0,
            video: t
        }, b, a.onerror || function(a) {
            console.error(a)
        }), c
    }
    a.FSRTC = function(b) {
        this.options = a.extend({
            useVideo: null,
            useStereo: !1,
            userData: null,
            localVideo: null,
            screenShare: !1,
            useCamera: "any",
            iceServers: !1,
            videoParams: {},
            audioParams: {},
            callbacks: {
                onICEComplete: function() {},
                onICE: function() {},
                onOfferSDP: function() {}
            }
        }, b), this.audioEnabled = !0, this.videoEnabled = !0, this.mediaData = {
            SDP: null,
            profile: {},
            candidateList: []
        }, this.constraints = {
            offerToReceiveAudio: "none" === this.options.useSpeak ? !1 : !0,
            offerToReceiveVideo: this.options.useVideo ? !0 : !1
        }, self.options.useVideo && (self.options.useVideo.style.display = "none"), e(), f()
    }, a.FSRTC.validRes = [], a.FSRTC.prototype.useVideo = function(a, b) {
        var c = this;
        a ? (c.options.useVideo = a, c.options.localVideo = b, c.constraints.offerToReceiveVideo = !0) : (c.options.useVideo = null, c.options.localVideo = null, c.constraints.offerToReceiveVideo = !1), c.options.useVideo && (c.options.useVideo.style.display = "none")
    }, a.FSRTC.prototype.useStereo = function(a) {
        var b = this;
        b.options.useStereo = a
    }, a.FSRTC.prototype.stereoHack = function(a) {
        var c = this;
        if (!c.options.useStereo) return a;
        var e, f = a.split("\r\n"),
            g = b(f, "a=rtpmap", "opus/48000");
        if (!g) return a;
        e = d(f[g]);
        var h = b(f, "a=fmtp:" + e.toString());
        return null === h ? f[g] = f[g] + "\r\na=fmtp:" + e.toString() + " stereo=1; sprop-stereo=1" : f[h] = f[h].concat("; stereo=1; sprop-stereo=1"), a = f.join("\r\n")
    }, FSRTCattachMediaStream = function(a, b) {
        "undefined" != typeof a.srcObject ? a.srcObject = b : "undefined" != typeof a.src ? a.src = URL.createObjectURL(b) : console.error("Error attaching stream to element.")
    }, a.FSRTC.prototype.answer = function(a, b, c) {
        this.peer.addAnswerSDP({
            type: "answer",
            sdp: a
        }, b, c)
    }, a.FSRTC.prototype.stopPeer = function() {
        self.peer && (console.log("stopping peer"), self.peer.stop())
    }, a.FSRTC.prototype.stop = function() {
        var a = this;
        if (a.options.useVideo && (a.options.useVideo.style.display = "none", a.options.useVideo.src = ""), a.localStream) {
            if ("function" == typeof a.localStream.stop) a.localStream.stop();
            else if (a.localStream.active) {
                var b = a.localStream.getTracks();
                console.log(b), b.forEach(function(a, b) {
                    console.log(a), a.stop()
                })
            }
            a.localStream = null
        }
        if (a.options.localVideo && (a.options.localVideo.style.display = "none", a.options.localVideo.src = ""), a.options.localVideoStream)
            if ("function" == typeof a.options.localVideoStream.stop) a.options.localVideoStream.stop();
            else if (a.options.localVideoStream.active) {
            var b = a.options.localVideoStream.getTracks();
            console.log(b), b.forEach(function(a, b) {
                console.log(a), a.stop()
            })
        }
        a.peer && (console.log("stopping peer"), a.peer.stop())
    }, a.FSRTC.prototype.getMute = function() {
        var a = this;
        return a.audioEnabled
    }, a.FSRTC.prototype.setMute = function(a) {
        for (var b = this, c = b.localStream.getAudioTracks(), d = 0, e = c.length; e > d; d++) {
            switch (a) {
                case "on":
                    c[d].enabled = !0;
                    break;
                case "off":
                    c[d].enabled = !1;
                    break;
                case "toggle":
                    c[d].enabled = !c[d].enabled
            }
            b.audioEnabled = c[d].enabled
        }
        return !b.audioEnabled
    }, a.FSRTC.prototype.getVideoMute = function() {
        var a = this;
        return a.videoEnabled
    }, a.FSRTC.prototype.setVideoMute = function(a) {
        for (var b = this, c = b.localStream.getVideoTracks(), d = 0, e = c.length; e > d; d++) {
            switch (a) {
                case "on":
                    c[d].enabled = !0;
                    break;
                case "off":
                    c[d].enabled = !1;
                    break;
                case "toggle":
                    c[d].enabled = !c[d].enabled
            }
            b.videoEnabled = c[d].enabled
        }
        return !b.videoEnabled
    }, a.FSRTC.prototype.createAnswer = function(a) {
        function b(a) {
            d.localStream = a, d.peer = r({
                type: d.type,
                attachStream: d.localStream,
                onICE: function(a) {
                    return j(d, a)
                },
                onICEComplete: function() {
                    return l(d)
                },
                onRemoteStream: function(a) {
                    return o(d, a)
                },
                onICESDP: function(a) {
                    return n(d, a)
                },
                onChannelError: function(a) {
                    return m(d, a)
                },
                constraints: d.constraints,
                iceServers: d.options.iceServers,
                offerSDP: {
                    type: "offer",
                    sdp: d.remoteSDP
                }
            }), i(d, a)
        }

        function c(a) {
            g(d, a)
        }
        var d = this;
        d.type = "answer", d.remoteSDP = a.sdp, console.debug("inbound sdp: ", a.sdp);
        var e = q(d);
        console.log("Audio constraints", e.audio), console.log("Video constraints", e.video), d.options.useVideo && d.options.localVideo && s({
            constraints: {
                audio: !1,
                video: {}
            },
            localVideo: d.options.localVideo,
            onsuccess: function(a) {
                d.options.localVideoStream = a, console.log("local video ready")
            },
            onerror: function(a) {
                console.error("local video error!")
            }
        }), s({
            constraints: {
                audio: e.audio,
                video: e.video
            },
            video: e.useVideo,
            onsuccess: b,
            onerror: c
        })
    }, a.FSRTC.prototype.call = function(a) {
        function b(a) {
            d.localStream = a, e && (d.constraints.offerToReceiveVideo = !1, d.constraints.offerToReceiveAudio = !1, d.constraints.offerToSendAudio = !1), d.peer = r({
                type: d.type,
                attachStream: d.localStream,
                onICE: function(a) {
                    return j(d, a)
                },
                onICEComplete: function() {
                    return l(d)
                },
                onRemoteStream: e ? function(a) {} : function(a) {
                    return o(d, a)
                },
                onOfferSDP: function(a) {
                    return p(d, a)
                },
                onICESDP: function(a) {
                    return n(d, a)
                },
                onChannelError: function(a) {
                    return m(d, a)
                },
                constraints: d.constraints,
                iceServers: d.options.iceServers
            }), i(d, a)
        }

        function c(a) {
            g(d, a)
        }
        f();
        var d = this,
            e = !1;
        d.type = "offer", d.options.videoParams && d.options.screenShare && (e = !0);
        var h = q(d);
        console.log("Audio constraints", h.audio), console.log("Video constraints", h.video), h.audio || h.video ? s({
            constraints: {
                audio: h.audio,
                video: h.video
            },
            video: h.useVideo,
            onsuccess: b,
            onerror: c
        }) : b(null)
    };
    var t = {};
    a.FSRTC.resSupported = function(b, c) {
        for (var d in a.FSRTC.validRes)
            if (a.FSRTC.validRes[d][0] == b && a.FSRTC.validRes[d][1] == c) return !0;
        return !1
    }, a.FSRTC.bestResSupported = function() {
        var b = 0,
            c = 0;
        for (var d in a.FSRTC.validRes) a.FSRTC.validRes[d][0] >= b && a.FSRTC.validRes[d][1] >= c && (b = a.FSRTC.validRes[d][0], c = a.FSRTC.validRes[d][1]);
        return [b, c]
    };
    var u = [
            [160, 120],
            [320, 180],
            [320, 240],
            [640, 360],
            [640, 480],
            [1280, 720],
            [1920, 1080]
        ],
        v = 0,
        x = 0,
        y = function(b, c) {
            if (v >= u.length) {
                var d = {
                    validRes: a.FSRTC.validRes,
                    bestResSupported: a.FSRTC.bestResSupported()
                };
                if (localStorage.setItem("res_" + b, a.toJSON(d)), c) return c(d)
            } else {
                var e = {};
                b && (e.deviceId = {
                    exact: b
                }), w = u[v][0], h = u[v][1], v++, e = {
                    width: {
                        exact: w
                    },
                    height: {
                        exact: h
                    }
                }, s({
                    constraints: {
                        audio: 0 == x++,
                        video: e
                    },
                    onsuccess: function(d) {
                        d.getTracks().forEach(function(a) {
                            a.stop()
                        }), console.info(w + "x" + h + " supported."), a.FSRTC.validRes.push([w, h]), y(b, c)
                    },
                    onerror: function(a) {
                        console.warn(w + "x" + h + " not supported."), y(b, c)
                    }
                })
            }
        };
    a.FSRTC.getValidRes = function(b, c) {
        var d = localStorage.getItem("res_" + b);
        if (d) {
            var e = a.parseJSON(d);
            return e ? (a.FSRTC.validRes = e.validRes, console.log("CACHED RES FOR CAM " + b, e)) : console.error("INVALID CACHE"), c ? c(e) : null
        }
        a.FSRTC.validRes = [], v = 0, y(b, c)
    }, a.FSRTC.checkPerms = function(b, c, d) {
        s({
            constraints: {
                audio: c,
                video: d
            },
            onsuccess: function(a) {
                a.getTracks().forEach(function(a) {
                    a.stop()
                }), console.info("media perm init complete"), b && setTimeout(b, 100, !0)
            },
            onerror: function(e) {
                return d && c ? (console.error("error, retesting with audio params only"), a.FSRTC.checkPerms(b, c, !1)) : (console.error("media perm init error"), void(b && b(!1)))
            }
        })
    }
}(jQuery),
function(a) {
    function b(a, b) {
        console.error("drop unauthorized channel: " + b), delete a.eventSUBS[b]
    }

    function c(a, b) {
        for (var c in a.eventSUBS[b]) a.eventSUBS[b][c].ready = !0, console.log("subscribed to channel: " + b), a.eventSUBS[b][c].readyHandler && a.eventSUBS[b][c].readyHandler(a, b)
    }

    function d(a, b, c, d) {
        var e = d || {},
            f = e.local,
            g = {
                eventChannel: b,
                userData: e.userData,
                handler: e.handler,
                ready: !1,
                readyHandler: e.readyHandler,
                serno: i++
            },
            h = !1;
        return a.eventSUBS[b] || (a.eventSUBS[b] = [], c.push(b), h = !0), a.eventSUBS[b].push(g), f && (g.ready = !0, g.local = !0), !h && a.eventSUBS[b][0].ready && (g.ready = !0, g.readyHandler && g.readyHandler(a, b)), {
            serno: g.serno,
            eventChannel: b
        }
    }

    function e() {
        a.verto.conf.prototype.listVideoLayouts = function() {
            this.modCommand("list-videoLayouts", null, null)
        }, a.verto.conf.prototype.play = function(a) {
            this.modCommand("play", null, a)
        }, a.verto.conf.prototype.stop = function() {
            this.modCommand("stop", null, "all")
        }, a.verto.conf.prototype.deaf = function(a) {
            this.modCommand("deaf", parseInt(a))
        }, a.verto.conf.prototype.undeaf = function(a) {
            this.modCommand("undeaf", parseInt(a))
        }, a.verto.conf.prototype.record = function(a) {
            this.modCommand("recording", null, ["start", a])
        }, a.verto.conf.prototype.stopRecord = function() {
            this.modCommand("recording", null, ["stop", "all"])
        }, a.verto.conf.prototype.snapshot = function(a) {
            if (!this.params.hasVid) throw "Conference has no video";
            this.modCommand("vid-write-png", null, a)
        }, a.verto.conf.prototype.setVideoLayout = function(a, b) {
            if (!this.params.hasVid) throw "Conference has no video";
            b ? this.modCommand("vid-layout", null, [a, b]) : this.modCommand("vid-layout", null, a)
        }, a.verto.conf.prototype.kick = function(a) {
            this.modCommand("kick", parseInt(a))
        }, a.verto.conf.prototype.muteMic = function(a) {
            this.modCommand("tmute", parseInt(a))
        }, a.verto.conf.prototype.muteVideo = function(a) {
            if (!this.params.hasVid) throw "Conference has no video";
            this.modCommand("tvmute", parseInt(a))
        }, a.verto.conf.prototype.presenter = function(a) {
            if (!this.params.hasVid) throw "Conference has no video";
            this.modCommand("vid-res-id", parseInt(a), "presenter")
        }, a.verto.conf.prototype.videoFloor = function(a) {
            if (!this.params.hasVid) throw "Conference has no video";
            this.modCommand("vid-floor", parseInt(a), "force")
        }, a.verto.conf.prototype.banner = function(a, b) {
            if (!this.params.hasVid) throw "Conference has no video";
            this.modCommand("vid-banner", parseInt(a), escape(b))
        }, a.verto.conf.prototype.volumeDown = function(a) {
            this.modCommand("volume_out", parseInt(a), "down")
        }, a.verto.conf.prototype.volumeUp = function(a) {
            this.modCommand("volume_out", parseInt(a), "up")
        }, a.verto.conf.prototype.gainDown = function(a) {
            this.modCommand("volume_in", parseInt(a), "down")
        }, a.verto.conf.prototype.gainUp = function(a) {
            this.modCommand("volume_in", parseInt(a), "up")
        }, a.verto.conf.prototype.transfer = function(a, b) {
            this.modCommand("transfer", parseInt(a), b)
        }, a.verto.conf.prototype.sendChat = function(a, b) {
            var c = this;
            c.verto.rpcClient.call("verto.broadcast", {
                eventChannel: c.params.laData.chatChannel,
                data: {
                    action: "send",
                    message: a,
                    type: b
                }
            })
        }
    }

    function f(b, c) {
        return c == a.verto["enum"].state.purge || a.verto["enum"].states[b.name][c.name] ? !0 : !1
    }

    function g(b) {
        for (var c in a.verto.audioOutDevices) {
            var d = a.verto.audioOutDevices[c];
            if (d.id === b) return d.label
        }
        return b
    }
    var h = "undefined" != typeof window.crypto && "undefined" != typeof window.crypto.getRandomValues ? function() {
        var a = new Uint16Array(8);
        window.crypto.getRandomValues(a);
        var b = function(a) {
            for (var b = a.toString(16); b.length < 4;) b = "0" + b;
            return b
        };
        return b(a[0]) + b(a[1]) + "-" + b(a[2]) + "-" + b(a[3]) + "-" + b(a[4]) + "-" + b(a[5]) + b(a[6]) + b(a[7])
    } : function() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(a) {
            var b = 16 * Math.random() | 0,
                c = "x" == a ? b : 3 & b | 8;
            return c.toString(16)
        })
    };
    a.verto = function(b, c) {
        var d = this;
        a.verto.saved.push(d), d.options = a.extend({
            login: null,
            passwd: null,
            socketUrl: null,
            tag: null,
            localTag: null,
            videoParams: {},
            audioParams: {},
            loginParams: {},
            deviceParams: {
                onResCheck: null
            },
            userVariables: {},
            iceServers: !1,
            ringSleep: 6e3,
            sessid: null
        }, b), d.options.deviceParams.useCamera && a.FSRTC.getValidRes(d.options.deviceParams.useCamera, d.options.deviceParams.onResCheck), d.options.deviceParams.useMic || (d.options.deviceParams.useMic = "any"), d.options.deviceParams.useSpeak || (d.options.deviceParams.useSpeak = "any"), d.options.sessid ? d.sessid = d.options.sessid : (d.sessid = localStorage.getItem("verto_session_uuid") || h(), localStorage.setItem("verto_session_uuid", d.sessid)), d.dialogs = {}, d.callbacks = c || {}, d.eventSUBS = {}, d.rpcClient = new a.JsonRpcClient({
            login: d.options.login,
            passwd: d.options.passwd,
            socketUrl: d.options.socketUrl,
            loginParams: d.options.loginParams,
            userVariables: d.options.userVariables,
            sessid: d.sessid,
            onmessage: function(a) {
                return d.handleMessage(a.eventData)
            },
            onWSConnect: function(a) {
                a.call("login", {})
            },
            onWSLogin: function(a) {
                d.callbacks.onWSLogin && d.callbacks.onWSLogin(d, a)
            },
            onWSClose: function(a) {
                d.callbacks.onWSClose && d.callbacks.onWSClose(d, a), d.purge()
            }
        });
        var e = d.options.tag;
        "function" == typeof e && (e = e()), d.options.ringFile && d.options.tag && (d.ringer = a("#" + e)), d.rpcClient.call("login", {})
    }, a.verto.prototype.deviceParams = function(b) {
        var c = this;
        for (var d in b) c.options.deviceParams[d] = b[d];
        b.useCamera && a.FSRTC.getValidRes(c.options.deviceParams.useCamera, b ? b.onResCheck : void 0)
    }, a.verto.prototype.videoParams = function(a) {
        var b = this;
        for (var c in a) b.options.videoParams[c] = a[c]
    }, a.verto.prototype.iceServers = function(a) {
        var b = this;
        b.options.iceServers = a
    }, a.verto.prototype.loginData = function(a) {
        var b = this;
        b.options.login = a.login, b.options.passwd = a.passwd, b.rpcClient.loginData(a)
    }, a.verto.prototype.logout = function(a) {
        var b = this;
        b.rpcClient.closeSocket(), b.callbacks.onWSClose && b.callbacks.onWSClose(b, !1), b.purge()
    }, a.verto.prototype.login = function(a) {
        var b = this;
        b.logout(), b.rpcClient.call("login", {})
    }, a.verto.prototype.message = function(a) {
        var b = this,
            c = 0;
        return a.to || (console.error("Missing To"), c++), a.body || (console.error("Missing Body"), c++), c ? !1 : (b.sendMethod("verto.info", {
            msg: a
        }), !0)
    }, a.verto.prototype.processReply = function(a, d, e) {
        var f, g = this;
        switch (a) {
            case "verto.subscribe":
                for (f in e.unauthorizedChannels) b(g, e.unauthorizedChannels[f]);
                for (f in e.subscribedChannels) c(g, e.subscribedChannels[f]);
                break;
            case "verto.unsubscribe":
        }
    }, a.verto.prototype.sendMethod = function(a, b) {
        var c = this;
        c.rpcClient.call(a, b, function(b) {
            c.processReply(a, !0, b)
        }, function(b) {
            c.processReply(a, !1, b)
        })
    };
    var i = 1;
    a.verto.prototype.subscribe = function(a, b) {
        var c = this,
            e = [],
            f = [],
            g = b || {};
        if ("string" == typeof a) e.push(d(c, a, f, g));
        else
            for (var h in a) e.push(d(c, a, f, g));
        return f.length && c.sendMethod("verto.subscribe", {
            eventChannel: 1 == f.length ? f[0] : f,
            subParams: g.subParams
        }), e
    }, a.verto.prototype.unsubscribe = function(a) {
        var b, c = this;
        if (a) {
            var d, e = {},
                f = [];
            if ("string" == typeof a) delete c.eventSUBS[a], e[a]++;
            else
                for (b in a)
                    if ("string" == typeof a[b]) d = a[b], delete c.eventSUBS[d], e[d]++;
                    else {
                        var g = [];
                        d = a[b].eventChannel;
                        for (var h in c.eventSUBS[d]) c.eventSUBS[d][h].serno == a[b].serno || g.push(c.eventSUBS[d][h]);
                        c.eventSUBS[d] = g, 0 === c.eventSUBS[d].length && (delete c.eventSUBS[d], e[d]++)
                    } for (var i in e) console.log("Sending Unsubscribe for: ", i), f.push(i);
            f.length && c.sendMethod("verto.unsubscribe", {
                eventChannel: 1 == f.length ? f[0] : f
            })
        } else
            for (b in c.eventSUBS) c.eventSUBS[b] && c.unsubscribe(c.eventSUBS[b])
    }, a.verto.prototype.broadcast = function(a, b) {
        var c = this,
            d = {
                eventChannel: a,
                data: {}
            };
        for (var e in b) d.data[e] = b[e];
        c.sendMethod("verto.broadcast", d)
    }, a.verto.prototype.purge = function(b) {
        var c, d = this,
            e = 0;
        for (c in d.dialogs) e || console.log("purging dialogs"), e++, d.dialogs[c].setState(a.verto["enum"].state.purge);
        for (c in d.eventSUBS) d.eventSUBS[c] && (console.log("purging subscription: " + c), delete d.eventSUBS[c])
    }, a.verto.prototype.hangup = function(a) {
        var b = this;
        if (a) {
            var c = b.dialogs[a];
            c && c.hangup()
        } else
            for (var d in b.dialogs) b.dialogs[d].hangup()
    }, a.verto.prototype.newCall = function(b, c) {
        var d = this;
        if (!d.rpcClient.socketReady()) return void console.error("Not Connected...");
        b.useCamera && (d.options.deviceParams.useCamera = b.useCamera);
        var e = new a.verto.dialog(a.verto["enum"].direction.outbound, this, b);
        return e.invite(), c && (e.callbacks = c), e
    }, a.verto.prototype.handleMessage = function(b) {
        var c = this;
        if (!b || !b.method) return void console.error("Invalid Data", b);
        if (b.params.callID) {
            var d = c.dialogs[b.params.callID];
            if ("verto.attach" === b.method && d && (delete d.verto.dialogs[d.callID], d.rtc.stop(), d = null), d) switch (b.method) {
                case "verto.bye":
                    d.hangup(b.params);
                    break;
                case "verto.answer":
                    d.handleAnswer(b.params);
                    break;
                case "verto.media":
                    d.handleMedia(b.params);
                    break;
                case "verto.display":
                    d.handleDisplay(b.params);
                    break;
                case "verto.info":
                    d.handleInfo(b.params);
                    break;
                default:
                    console.debug("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED", d, b.method)
            } else switch (b.method) {
                case "verto.attach":
                    b.params.attach = !0, b.params.sdp && b.params.sdp.indexOf("m=video") > 0 && (b.params.useVideo = !0), b.params.sdp && b.params.sdp.indexOf("stereo=1") > 0 && (b.params.useStereo = !0), d = new a.verto.dialog(a.verto["enum"].direction.inbound, c, b.params), d.setState(a.verto["enum"].state.recovering);
                    break;
                case "verto.invite":
                    b.params.sdp && b.params.sdp.indexOf("m=video") > 0 && (b.params.wantVideo = !0), b.params.sdp && b.params.sdp.indexOf("stereo=1") > 0 && (b.params.useStereo = !0), d = new a.verto.dialog(a.verto["enum"].direction.inbound, c, b.params);
                    break;
                default:
                    console.debug("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED")
            }
            return {
                method: b.method
            }
        }
        switch (b.method) {
            case "verto.punt":
                c.purge(), c.logout();
                break;
            case "verto.event":
                var e = null,
                    f = null;
                if (b.params && (f = b.params.eventChannel), f && (e = c.eventSUBS[f], e || (e = c.eventSUBS[f.split(".")[0]])), !e && f && f === c.sessid) c.callbacks.onMessage && c.callbacks.onMessage(c, null, a.verto["enum"].message.pvtEvent, b.params);
                else if (!e && f && c.dialogs[f]) c.dialogs[f].sendMessage(a.verto["enum"].message.pvtEvent, b.params);
                else if (e)
                    for (var g in e) {
                        var h = e[g];
                        h && h.ready ? h.handler ? h.handler(c, b.params, h.userData) : c.callbacks.onEvent ? c.callbacks.onEvent(c, b.params, h.userData) : console.log("EVENT:", b.params) : console.error("invalid EVENT for " + f + " IGNORED")
                    } else f || (f = "UNDEFINED"), console.error("UNSUBBED or invalid EVENT " + f + " IGNORED");
                break;
            case "verto.info":
                c.callbacks.onMessage && c.callbacks.onMessage(c, null, a.verto["enum"].message.info, b.params.msg), console.debug("MESSAGE from: " + b.params.msg.from, b.params.msg.body);
                break;
            case "verto.clientReady":
                c.callbacks.onMessage(c, null, a.verto["enum"].message.clientReady, b.params), console.debug("CLIENT READY", b.params);
                break;
            default:
                console.error("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED", b.method)
        }
    };
    var j = function(a, b) {
            for (var c = [], d = a.length, e = 0; d > e; e++) a[e] != b && c.push(a[e]);
            return c
        },
        k = function() {
            var a = this,
                b = {},
                c = [];
            a.reorder = function(a) {
                c = a;
                var d = b;
                b = {};
                for (var e = c.length, f = 0; e > f; f++) {
                    var g = c[f];
                    d[g] && (b[g] = d[g], delete d[g])
                }
                d = void 0
            }, a.clear = function() {
                b = void 0, c = void 0, b = {}, c = []
            }, a.add = function(a, d, e) {
                var f = !1;
                if (!b[a])
                    if (void 0 === e || 0 > e || e >= c.length) c.push(a);
                    else {
                        for (var g = 0, h = [], i = c.length, j = 0; i > j; j++) g++ == e && h.push(a), h.push(c[j]);
                        c = void 0, c = h, h = void 0, f = !0
                    }
                return b[a] = d, f
            }, a.del = function(a) {
                var d = !1;
                return b[a] ? (c = j(c, a), delete b[a], d = !0) : console.error("can't del nonexistant key " + a), d
            }, a.get = function(a) {
                return b[a]
            }, a.order = function() {
                return c
            }, a.hash = function() {
                return b
            }, a.indexOf = function(a) {
                for (var b = c.length, d = 0; b > d; d++)
                    if (c[d] == a) return d
            }, a.arrayLen = function() {
                return c.length
            }, a.asArray = function() {
                for (var a = [], d = c.length, e = 0; d > e; e++) {
                    var f = c[e];
                    a.push(b[f]);
                }
                return a
            }, a.each = function(a) {
                for (var d = c.length, e = 0; d > e; e++) a(c[e], b[c[e]])
            }, a.dump = function(b) {
                var c = "";
                return a.each(function(a, d) {
                    c += "name: " + a + " val: " + JSON.stringify(d) + (b ? "<br>" : "\n")
                }), c
            }
        };
    a.verto.liveArray = function(a, b, c, d) {
        var e = this,
            f = 0,
            g = null,
            h = d.userObj;
        k.call(e), e._add = e.add, e._del = e.del, e._reorder = e.reorder, e._clear = e.clear, e.context = b, e.name = c, e.user_obj = h, e.verto = a, e.broadcast = function(b, c) {
            a.broadcast(b, c)
        }, e.errs = 0, e.clear = function() {
            e._clear(), f = 0, e.onChange && e.onChange(e, {
                action: "clear"
            })
        }, e.checkSerno = function(a) {
            return 0 > a ? !0 : f > 0 && a != f + 1 ? (e.onErr && e.onErr(e, {
                lastSerno: f,
                serno: a
            }), e.errs++, console.debug(e.errs), e.errs < 3 && e.bootstrap(e.user_obj), !1) : (f = a, !0)
        }, e.reorder = function(a, b) {
            e.checkSerno(a) && (e._reorder(b), e.onChange && e.onChange(e, {
                serno: a,
                action: "reorder"
            }))
        }, e.init = function(a, b, c, d) {
            (null === c || void 0 === c) && (c = a), e.checkSerno(a) && e.onChange && e.onChange(e, {
                serno: a,
                action: "init",
                index: d,
                key: c,
                data: b
            })
        }, e.bootObj = function(a, b) {
            if (e.checkSerno(a)) {
                for (var c in b) e._add(b[c][0], b[c][1]);
                e.onChange && e.onChange(e, {
                    serno: a,
                    action: "bootObj",
                    data: b,
                    redraw: !0
                })
            }
        }, e.add = function(a, b, c, d) {
            if ((null === c || void 0 === c) && (c = a), e.checkSerno(a)) {
                var f = e._add(c, b, d);
                e.onChange && e.onChange(e, {
                    serno: a,
                    action: "add",
                    index: d,
                    key: c,
                    data: b,
                    redraw: f
                })
            }
        }, e.modify = function(a, b, c, d) {
            (null === c || void 0 === c) && (c = a), e.checkSerno(a) && (e._add(c, b, d), e.onChange && e.onChange(e, {
                serno: a,
                action: "modify",
                key: c,
                data: b,
                index: d
            }))
        }, e.del = function(a, b, c) {
            if ((null === b || void 0 === b) && (b = a), e.checkSerno(a)) {
                (null === c || 0 > c || void 0 === c) && (c = e.indexOf(b));
                var d = e._del(b);
                d && e.onChange && e.onChange(e, {
                    serno: a,
                    action: "del",
                    key: b,
                    index: c
                })
            }
        };
        var i = function(a, b, c) {
            var d = b.data;
            if (d.name == c.name) switch (d.action) {
                case "init":
                    c.init(d.wireSerno, d.data, d.hashKey, d.arrIndex);
                    break;
                case "bootObj":
                    c.bootObj(d.wireSerno, d.data);
                    break;
                case "add":
                    c.add(d.wireSerno, d.data, d.hashKey, d.arrIndex);
                    break;
                case "modify":
                    d.arrIndex || d.hashKey ? c.modify(d.wireSerno, d.data, d.hashKey, d.arrIndex) : console.error("Invalid Packet", d);
                    break;
                case "del":
                    d.arrIndex || d.hashKey ? c.del(d.wireSerno, d.hashKey, d.arrIndex) : console.error("Invalid Packet", d);
                    break;
                case "clear":
                    c.clear();
                    break;
                case "reorder":
                    c.reorder(d.wireSerno, d.order);
                    break;
                default:
                    c.checkSerno(d.wireSerno) && c.onChange && c.onChange(c, {
                        serno: d.wireSerno,
                        action: d.action,
                        data: d.data
                    })
            }
        };
        e.context && (g = e.verto.subscribe(e.context, {
            handler: i,
            userData: e,
            subParams: d.subParams
        })), e.destroy = function() {
            e._clear(), e.verto.unsubscribe(g)
        }, e.sendCommand = function(a, b) {
            var c = e;
            c.broadcast(c.context, {
                liveArray: {
                    command: a,
                    context: c.context,
                    name: c.name,
                    obj: b
                }
            })
        }, e.bootstrap = function(a) {
            e.sendCommand("bootstrap", a)
        }, e.changepage = function(a) {
            var b = e;
            b.clear(), b.broadcast(b.context, {
                liveArray: {
                    command: "changepage",
                    context: e.context,
                    name: e.name,
                    obj: a
                }
            })
        }, e.heartbeat = function(a) {
            var b = e,
                c = function() {
                    b.heartbeat.call(b, a)
                };
            b.broadcast(b.context, {
                liveArray: {
                    command: "heartbeat",
                    context: b.context,
                    name: b.name,
                    obj: a
                }
            }), b.hb_pid = setTimeout(c, 3e4)
        }, e.bootstrap(e.user_obj)
    }, a.verto.liveTable = function(b, c, d, e, f) {
        function g(b) {
            if ("string" == typeof b[4] && b[4].indexOf("{") > -1) {
                var c = a.parseJSON(b[4]);
                b[4] = c.oldStatus, b[5] = null
            }
            return b
        }

        function h(a) {
            var b = a.asArray();
            for (var c in b) b[c] = g(b[c]);
            return b
        }
        var i, j = new a.verto.liveArray(b, c, d, {
                subParams: f.subParams
            }),
            k = this;
        k.liveArray = j, k.dataTable = i, k.verto = b, k.destroy = function() {
            i && i.fnDestroy(), j && j.destroy(), i = null, j = null
        }, j.onErr = function(a, b) {
            console.error("Error: ", a, b)
        }, j.onChange = function(a, b) {
            var c = 0,
                d = 0;
            if (!i) {
                if (!f.aoColumns) {
                    if ("init" != b.action) return;
                    f.aoColumns = [];
                    for (var k in b.data) f.aoColumns.push({
                        sTitle: b.data[k]
                    })
                }
                i = e.dataTable(f)
            }
            if (i && ("del" == b.action || "modify" == b.action) && (c = b.index, void 0 === c && b.key && (c = j.indexOf(b.key)), void 0 === c)) return void console.error("INVALID PACKET Missing INDEX\n", b);
            f.onChange && f.onChange(a, b);
            try {
                switch (b.action) {
                    case "bootObj":
                        if (!b.data) return void console.error("missing data");
                        i.fnClearTable(), i.fnAddData(h(a)), i.fnAdjustColumnSizing();
                        break;
                    case "add":
                        if (!b.data) return void console.error("missing data");
                        b.redraw > -1 ? (i.fnClearTable(), i.fnAddData(h(a))) : i.fnAddData(g(b.data)), i.fnAdjustColumnSizing();
                        break;
                    case "modify":
                        if (!b.data) return;
                        i.fnUpdate(g(b.data), c), i.fnAdjustColumnSizing();
                        break;
                    case "del":
                        i.fnDeleteRow(c), i.fnAdjustColumnSizing();
                        break;
                    case "clear":
                        i.fnClearTable();
                        break;
                    case "reorder":
                        i.fnClearTable(), i.fnAddData(h(a));
                        break;
                    case "hide":
                        e.hide();
                        break;
                    case "show":
                        e.show()
                }
            } catch (l) {
                console.error("ERROR: " + l), d++
            }
            d ? (a.errs++, a.errs < 3 && a.bootstrap(a.user_obj)) : a.errs = 0
        }, j.onChange(j, {
            action: "init"
        })
    };
    var l = 1;
    a.verto.conf = function(b, c) {
        var d = this;
        d.params = a.extend({
            dialog: null,
            hasVid: !1,
            laData: null,
            onBroadcast: null,
            onLaChange: null,
            onLaRow: null
        }, c), d.verto = b, d.serno = l++, e(), b.subscribe(d.params.laData.modChannel, {
            handler: function(a, c) {
                d.params.onBroadcast && d.params.onBroadcast(b, d, c.data)
            }
        }), b.subscribe(d.params.laData.infoChannel, {
            handler: function(a, b) {
                "function" == typeof d.params.infoCallback && d.params.infoCallback(a, b)
            }
        }), b.subscribe(d.params.laData.chatChannel, {
            handler: function(a, b) {
                "function" == typeof d.params.chatCallback && d.params.chatCallback(a, b)
            }
        })
    }, a.verto.conf.prototype.modCommand = function(a, b, c) {
        var d = this;
        d.verto.rpcClient.call("verto.broadcast", {
            eventChannel: d.params.laData.modChannel,
            data: {
                application: "conf-control",
                command: a,
                id: b,
                value: c
            }
        })
    }, a.verto.conf.prototype.destroy = function() {
        var a = this;
        a.destroyed = !0, a.params.onBroadcast(a.verto, a, "destroy"), a.params.laData.modChannel && a.verto.unsubscribe(a.params.laData.modChannel), a.params.laData.chatChannel && a.verto.unsubscribe(a.params.laData.chatChannel), a.params.laData.infoChannel && a.verto.unsubscribe(a.params.laData.infoChannel)
    }, a.verto.modfuncs = {}, a.verto.confMan = function(b, c) {
        function d(b) {
            var c = "play_" + f.serno,
                d = "stop_" + f.serno,
                e = "recording_" + f.serno,
                g = "snapshot_" + f.serno,
                h = "recording_stop" + f.serno,
                i = "confman_" + f.serno,
                j = "<div id='" + i + "'><br><button class='ctlbtn' id='" + c + "'>Play</button><button class='ctlbtn' id='" + d + "'>Stop</button><button class='ctlbtn' id='" + e + "'>Record</button><button class='ctlbtn' id='" + h + "'>Record Stop</button>" + (f.params.hasVid ? "<button class='ctlbtn' id='" + g + "'>PNG Snapshot</button>" : "") + "<br><br></div>";
            if (b.html(j), a.verto.modfuncs.change_video_layout = function(b, c) {
                    var d = a("#" + b + " option:selected").text();
                    "none" !== d && f.modCommand("vid-layout", null, [d, c])
                }, f.params.hasVid) {
                for (var k = 0; k < f.canvasCount; k++) {
                    var l = "confman_vid_layout_" + k + "_" + f.serno,
                        m = "confman_vl_select_" + k + "_" + f.serno,
                        n = "<div id='" + l + "'><br><b>Video Layout Canvas " + (k + 1) + "</b> <select onChange='$.verto.modfuncs.change_video_layout(\"" + l + '", "' + (k + 1) + "\")' id='" + m + "'></select> <br><br></div>";
                    b.append(n)
                }
                a("#" + g).click(function() {
                    var a = prompt("Please enter file name", "");
                    a && f.modCommand("vid-write-png", null, a)
                })
            }
            a("#" + c).click(function() {
                var a = prompt("Please enter file name", "");
                a && f.modCommand("play", null, a)
            }), a("#" + d).click(function() {
                f.modCommand("stop", null, "all")
            }), a("#" + e).click(function() {
                var a = prompt("Please enter file name", "");
                a && f.modCommand("recording", null, ["start", a])
            }), a("#" + h).click(function() {
                f.modCommand("recording", null, ["stop", "all"])
            })
        }

        function e(b, c) {
            var d = parseInt(c),
                e = "kick_" + d,
                g = "canvas_in_next_" + d,
                h = "canvas_in_prev_" + d,
                i = "canvas_out_next_" + d,
                j = "canvas_out_prev_" + d,
                k = "canvas_in_set_" + d,
                l = "canvas_out_set_" + d,
                m = "layer_set_" + d,
                n = "layer_next_" + d,
                o = "layer_prev_" + d,
                p = "tmute_" + d,
                q = "tvmute_" + d,
                r = "vbanner_" + d,
                s = "tvpresenter_" + d,
                t = "tvfloor_" + d,
                u = "box_" + d,
                v = "gain_in_up" + d,
                w = "gain_in_dn" + d,
                x = "vol_in_up" + d,
                y = "vol_in_dn" + d,
                z = "transfer" + d,
                A = "<div id='" + u + "'>";
            return A += "<b>General Controls</b><hr noshade>", A += "<button class='ctlbtn' id='" + e + "'>Kick</button><button class='ctlbtn' id='" + p + "'>Mute</button><button class='ctlbtn' id='" + v + "'>Gain -</button><button class='ctlbtn' id='" + w + "'>Gain +</button><button class='ctlbtn' id='" + y + "'>Vol -</button><button class='ctlbtn' id='" + x + "'>Vol +</button><button class='ctlbtn' id='" + z + "'>Transfer</button>", f.params.hasVid && (A += "<br><br><b>Video Controls</b><hr noshade>", A += "<button class='ctlbtn' id='" + q + "'>VMute</button><button class='ctlbtn' id='" + s + "'>Presenter</button><button class='ctlbtn' id='" + t + "'>Vid Floor</button><button class='ctlbtn' id='" + r + "'>Banner</button>", f.canvasCount > 1 && (A += "<br><br><b>Canvas Controls</b><hr noshade><button class='ctlbtn' id='" + k + "'>Set Input Canvas</button><button class='ctlbtn' id='" + h + "'>Prev Input Canvas</button><button class='ctlbtn' id='" + g + "'>Next Input Canvas</button><br><button class='ctlbtn' id='" + l + "'>Set Watching Canvas</button><button class='ctlbtn' id='" + j + "'>Prev Watching Canvas</button><button class='ctlbtn' id='" + i + "'>Next Watching Canvas</button>"), A += "<br><button class='ctlbtn' id='" + m + "'>Set Layer</button><button class='ctlbtn' id='" + o + "'>Prev Layer</button><button class='ctlbtn' id='" + n + "'>Next Layer</button></div>"), b.html(A), b.data("mouse") || a("#" + u).hide(), b.mouseover(function(c) {
                b.data({
                    mouse: !0
                }), a("#" + u).show()
            }), b.mouseout(function(c) {
                b.data({
                    mouse: !1
                }), a("#" + u).hide()
            }), a("#" + z).click(function() {
                var a = prompt("Enter Extension");
                a && f.modCommand("transfer", d, a)
            }), a("#" + e).click(function() {
                f.modCommand("kick", d)
            }), a("#" + m).click(function() {
                var a = prompt("Please enter layer ID", "");
                a && f.modCommand("vid-layer", d, a)
            }), a("#" + n).click(function() {
                f.modCommand("vid-layer", d, "next")
            }), a("#" + o).click(function() {
                f.modCommand("vid-layer", d, "prev")
            }), a("#" + k).click(function() {
                var a = prompt("Please enter canvas ID", "");
                a && f.modCommand("vid-canvas", d, a)
            }), a("#" + l).click(function() {
                var a = prompt("Please enter canvas ID", "");
                a && f.modCommand("vid-watching-canvas", d, a)
            }), a("#" + g).click(function() {
                f.modCommand("vid-canvas", d, "next")
            }), a("#" + h).click(function() {
                f.modCommand("vid-canvas", d, "prev")
            }), a("#" + i).click(function() {
                f.modCommand("vid-watching-canvas", d, "next")
            }), a("#" + j).click(function() {
                f.modCommand("vid-watching-canvas", d, "prev")
            }), a("#" + p).click(function() {
                f.modCommand("tmute", d)
            }), f.params.hasVid && (a("#" + q).click(function() {
                f.modCommand("tvmute", d)
            }), a("#" + s).click(function() {
                f.modCommand("vid-res-id", d, "presenter")
            }), a("#" + t).click(function() {
                f.modCommand("vid-floor", d, "force")
            }), a("#" + r).click(function() {
                var a = prompt("Please enter text", "");
                a && f.modCommand("vid-banner", d, escape(a))
            })), a("#" + v).click(function() {
                f.modCommand("volume_in", d, "up")
            }), a("#" + w).click(function() {
                f.modCommand("volume_in", d, "down")
            }), a("#" + x).click(function() {
                f.modCommand("volume_out", d, "up")
            }), a("#" + y).click(function() {
                f.modCommand("volume_out", d, "down")
            }), A
        }
        var f = this;
        f.params = a.extend({
            tableID: null,
            statusID: null,
            mainModID: null,
            dialog: null,
            hasVid: !1,
            laData: null,
            onBroadcast: null,
            onLaChange: null,
            onLaRow: null
        }, c), f.verto = b, f.serno = l++, f.canvasCount = f.params.laData.canvasCount;
        var g = "",
            h = 0;
        b.subscribe(f.params.laData.infoChannel, {
            handler: function(a, b) {
                "function" == typeof f.params.infoCallback && f.params.infoCallback(a, b)
            }
        }), b.subscribe(f.params.laData.chatChannel, {
            handler: function(a, b) {
                "function" == typeof f.params.chatCallback && f.params.chatCallback(a, b)
            }
        }), "moderator" === f.params.laData.role && (g = "Action", h = 600, f.params.mainModID ? (d(a(f.params.mainModID)), a(f.params.displayID).html("Moderator Controls Ready<br><br>")) : a(f.params.mainModID).html(""), b.subscribe(f.params.laData.modChannel, {
            handler: function(c, d) {
                if (f.params.onBroadcast && f.params.onBroadcast(b, f, d.data), "list-videoLayouts" === d.data["conf-command"])
                    for (var e = 0; e < f.canvasCount; e++) {
                        var g, h = "#confman_vl_select_" + e + "_" + f.serno,
                            i = "#confman_vid_layout_" + e + "_" + f.serno,
                            j = 0;
                        if (a(h).selectmenu({}), a(h).selectmenu("enable"), a(h).empty(), a(h).append(new Option("Choose a Layout", "none")), d.data.responseData) {
                            var k = [];
                            for (var l in d.data.responseData) k.push(d.data.responseData[l].name);
                            g = k.sort(function(a, b) {
                                var c = "group:" == a.substring(0, 6) ? !0 : !1,
                                    d = "group:" == b.substring(0, 6) ? !0 : !1;
                                return (c || d) && c != d ? c ? -1 : 1 : a == b ? 0 : a > b ? 1 : -1
                            });
                            for (var l in g) a(h).append(new Option(g[l], g[l])), j++
                        }
                        j ? a(h).selectmenu("refresh", !0) : a(i).hide()
                    } else !f.destroyed && f.params.displayID && (a(f.params.displayID).html(d.data.response + "<br><br>"), f.lastTimeout && (clearTimeout(f.lastTimeout), f.lastTimeout = 0), f.lastTimeout = setTimeout(function() {
                        a(f.params.displayID).html(f.destroyed ? "" : "Moderator Controls Ready<br><br>")
                    }, 4e3))
            }
        }), f.params.hasVid && f.modCommand("list-videoLayouts", null, null));
        var i = null;
        "moderator" === f.params.laData.role && (i = function(c, d, g, h) {
            if (!d[5]) {
                var i = a("td:eq(5)", c);
                e(i, d), f.params.onLaRow && f.params.onLaRow(b, f, i, d)
            }
        }), f.lt = new a.verto.liveTable(b, f.params.laData.laChannel, f.params.laData.laName, a(f.params.tableID), {
            subParams: {
                callID: f.params.dialog ? f.params.dialog.callID : null
            },
            onChange: function(c, d) {
                a(f.params.statusID).text("Conference Members:  (" + c.arrayLen() + " Total)"), f.params.onLaChange && f.params.onLaChange(b, f, a.verto["enum"].confEvent.laChange, c, d)
            },
            aaData: [],
            aoColumns: [{
                sTitle: "ID",
                sWidth: "50"
            }, {
                sTitle: "Number",
                sWidth: "250"
            }, {
                sTitle: "Name",
                sWidth: "250"
            }, {
                sTitle: "Codec",
                sWidth: "100"
            }, {
                sTitle: "Status",
                sWidth: f.params.hasVid ? "200px" : "150px"
            }, {
                sTitle: g,
                sWidth: h
            }],
            bAutoWidth: !0,
            bDestroy: !0,
            bSort: !1,
            bInfo: !1,
            bFilter: !1,
            bLengthChange: !1,
            bPaginate: !1,
            iDisplayLength: 1400,
            oLanguage: {
                sEmptyTable: "The Conference is Empty....."
            },
            fnRowCallback: i
        })
    }, a.verto.confMan.prototype.modCommand = function(a, b, c) {
        var d = this;
        d.verto.rpcClient.call("verto.broadcast", {
            eventChannel: d.params.laData.modChannel,
            data: {
                application: "conf-control",
                command: a,
                id: b,
                value: c
            }
        })
    }, a.verto.confMan.prototype.sendChat = function(a, b) {
        var c = this;
        c.verto.rpcClient.call("verto.broadcast", {
            eventChannel: c.params.laData.chatChannel,
            data: {
                action: "send",
                message: a,
                type: b
            }
        })
    }, a.verto.confMan.prototype.destroy = function() {
        var b = this;
        b.destroyed = !0, b.lt && b.lt.destroy(), b.params.laData.chatChannel && b.verto.unsubscribe(b.params.laData.chatChannel), b.params.laData.modChannel && b.verto.unsubscribe(b.params.laData.modChannel), b.params.mainModID && a(b.params.mainModID).html("")
    }, a.verto.dialog = function(b, c, d) {
        var e = this;
        e.params = a.extend({
            useVideo: c.options.useVideo,
            useStereo: c.options.useStereo,
            screenShare: !1,
            useCamera: !1,
            useMic: c.options.deviceParams.useMic,
            useSpeak: c.options.deviceParams.useSpeak,
            tag: c.options.tag,
            localTag: c.options.localTag,
            login: c.options.login,
            videoParams: c.options.videoParams
        }, d), e.params.screenShare || (e.params.useCamera = c.options.deviceParams.useCamera), e.verto = c, e.direction = b, e.lastState = null, e.state = e.lastState = a.verto["enum"].state["new"], e.callbacks = c.callbacks, e.answered = !1, e.attach = d.attach || !1, e.screenShare = d.screenShare || !1, e.useCamera = e.params.useCamera, e.useMic = e.params.useMic, e.useSpeak = e.params.useSpeak, e.params.callID ? e.callID = e.params.callID : e.callID = e.params.callID = h(), "function" == typeof e.params.tag && (e.params.tag = e.params.tag()), e.params.tag && (e.audioStream = document.getElementById(e.params.tag), e.params.useVideo && (e.videoStream = e.audioStream)), e.params.localTag && (e.localVideo = document.getElementById(e.params.localTag)), e.verto.dialogs[e.callID] = e;
        var f = {};
        e.direction == a.verto["enum"].direction.inbound ? ("outbound" === e.params.display_direction ? (e.params.remote_caller_id_name = e.params.caller_id_name, e.params.remote_caller_id_number = e.params.caller_id_number) : (e.params.remote_caller_id_name = e.params.callee_id_name, e.params.remote_caller_id_number = e.params.callee_id_number), e.params.remote_caller_id_name || (e.params.remote_caller_id_name = "Nobody"), e.params.remote_caller_id_number || (e.params.remote_caller_id_number = "UNKNOWN"), f.onMessage = function(a, b) {
            console.debug(b)
        }, f.onAnswerSDP = function(a, b) {
            console.error("answer sdp", b)
        }) : (e.params.remote_caller_id_name = "Outbound Call", e.params.remote_caller_id_number = e.params.destination_number), f.onICESDP = function(b) {
            return console.log("RECV " + b.type + " SDP", b.mediaData.SDP), e.state == a.verto["enum"].state.requesting || e.state == a.verto["enum"].state.answering || e.state == a.verto["enum"].state.active ? void location.reload() : void("offer" == b.type ? e.state == a.verto["enum"].state.active ? (e.setState(a.verto["enum"].state.requesting), e.sendMethod("verto.attach", {
                sdp: b.mediaData.SDP
            })) : (e.setState(a.verto["enum"].state.requesting), e.sendMethod("verto.invite", {
                sdp: b.mediaData.SDP
            })) : (e.setState(a.verto["enum"].state.answering), e.sendMethod(e.attach ? "verto.attach" : "verto.answer", {
                sdp: e.rtc.mediaData.SDP
            })))
        }, f.onICE = function(a) {
            return "offer" == a.type ? void console.log("offer", a.mediaData.candidate) : void 0
        }, f.onStream = function(a, b) {
            e.verto.options.permissionCallback && "function" == typeof e.verto.options.permissionCallback.onGranted && e.verto.options.permissionCallback.onGranted(b), console.log("stream started")
        }, f.onError = function(a) {
            e.verto.options.permissionCallback && "function" == typeof e.verto.options.permissionCallback.onDenied && e.verto.options.permissionCallback.onDenied(), console.error("ERROR:", a), e.hangup({
                cause: "Device or Permission Error"
            })
        }, e.rtc = new a.FSRTC({
            callbacks: f,
            localVideo: e.screenShare ? null : e.localVideo,
            useVideo: e.params.useVideo ? e.videoStream : null,
            useAudio: e.audioStream,
            useStereo: e.params.useStereo,
            videoParams: e.params.videoParams,
            audioParams: c.options.audioParams,
            iceServers: c.options.iceServers,
            screenShare: e.screenShare,
            useCamera: e.useCamera,
            useMic: e.useMic,
            useSpeak: e.useSpeak
        }), e.rtc.verto = e.verto, e.direction == a.verto["enum"].direction.inbound && (e.attach ? e.answer() : e.ring())
    }, a.verto.dialog.prototype.invite = function() {
        var a = this;
        a.rtc.call()
    }, a.verto.dialog.prototype.sendMethod = function(a, b) {
        var c = this;
        b.dialogParams = {};
        for (var d in c.params)("sdp" != d || "verto.invite" == a || "verto.attach" == a) && (b.noDialogParams && "callID" != d || (b.dialogParams[d] = c.params[d]));
        delete b.noDialogParams, c.verto.rpcClient.call(a, b, function(b) {
            c.processReply(a, !0, b)
        }, function(b) {
            c.processReply(a, !1, b)
        })
    }, a.verto.dialog.prototype.setAudioPlaybackDevice = function(a, b, c) {
        var d = this,
            e = d.audioStream;
        if ("undefined" != typeof e.sinkId) {
            var f = g(a);
            console.info("Dialog: " + d.callID + " Setting speaker:", e, f), e.setSinkId(a).then(function() {
                console.log("Dialog: " + d.callID + " Success, audio output device attached: " + a), b && b(!0, f, c)
            })["catch"](function(a) {
                var e = a;
                "SecurityError" === a.name && (e = "Dialog: " + d.callID + " You need to use HTTPS for selecting audio output device: " + a), b && b(!1, null, c), console.error(e)
            })
        } else console.warn("Dialog: " + d.callID + " Browser does not support output device selection."), b && b(!1, null, c)
    }, a.verto.dialog.prototype.setState = function(b) {
        var c = this;
        if (c.state == a.verto["enum"].state.ringing && c.stopRinging(), c.state == b || !f(c.state, b)) return console.error("Dialog " + c.callID + ": INVALID state change from " + c.state.name + " to " + b.name), c.hangup(), !1;
        switch (console.log("Dialog " + c.callID + ": state change from " + c.state.name + " to " + b.name), c.lastState = c.state, c.state = b, c.callbacks.onDialogState && c.callbacks.onDialogState(this), c.state) {
            case a.verto["enum"].state.early:
            case a.verto["enum"].state.active:
                var d = c.useSpeak;
                console.info("Using Speaker: ", d), d && "any" !== d && "none" !== d && setTimeout(function() {
                    c.setAudioPlaybackDevice(d)
                }, 500);
                break;
            case a.verto["enum"].state.trying:
                setTimeout(function() {
                    c.state == a.verto["enum"].state.trying && c.setState(a.verto["enum"].state.hangup)
                }, 3e4);
                break;
            case a.verto["enum"].state.purge:
                c.setState(a.verto["enum"].state.destroy);
                break;
            case a.verto["enum"].state.hangup:
                c.lastState.val > a.verto["enum"].state.requesting.val && c.lastState.val < a.verto["enum"].state.hangup.val && c.sendMethod("verto.bye", {}), c.setState(a.verto["enum"].state.destroy);
                break;
            case a.verto["enum"].state.destroy:
                "function" == typeof c.verto.options.tag && a("#" + c.params.tag).remove(), delete c.verto.dialogs[c.callID], c.params.screenShare ? c.rtc.stopPeer() : c.rtc.stop()
        }
        return !0
    }, a.verto.dialog.prototype.processReply = function(b, c, d) {
        var e = this;
        switch (b) {
            case "verto.answer":
            case "verto.attach":
                c ? e.setState(a.verto["enum"].state.active) : e.hangup();
                break;
            case "verto.invite":
                c ? e.setState(a.verto["enum"].state.trying) : e.setState(a.verto["enum"].state.destroy);
                break;
            case "verto.bye":
                e.hangup();
                break;
            case "verto.modify":
                d.holdState && ("held" == d.holdState ? e.state != a.verto["enum"].state.held && e.setState(a.verto["enum"].state.held) : "active" == d.holdState && e.state != a.verto["enum"].state.active && e.setState(a.verto["enum"].state.active))
        }
    }, a.verto.dialog.prototype.hangup = function(b) {
        var c = this;
        b && (b.causeCode && (c.causeCode = b.causeCode), b.cause && (c.cause = b.cause)), c.cause || c.causeCode || (c.cause = "NORMAL_CLEARING"), c.state.val >= a.verto["enum"].state["new"].val && c.state.val < a.verto["enum"].state.hangup.val ? c.setState(a.verto["enum"].state.hangup) : c.state.val < a.verto["enum"].state.destroy && c.setState(a.verto["enum"].state.destroy)
    }, a.verto.dialog.prototype.stopRinging = function() {
        var a = this;
        a.verto.ringer && a.verto.ringer.stop()
    }, a.verto.dialog.prototype.indicateRing = function() {
        var b = this;
        b.verto.ringer && (b.verto.ringer.attr("src", b.verto.options.ringFile)[0].play(), setTimeout(function() {
            b.stopRinging(), b.state == a.verto["enum"].state.ringing && b.indicateRing()
        }, b.verto.options.ringSleep))
    }, a.verto.dialog.prototype.ring = function() {
        var b = this;
        b.setState(a.verto["enum"].state.ringing), b.indicateRing()
    }, a.verto.dialog.prototype.useVideo = function(a) {
        var b = this;
        b.params.useVideo = a, a ? b.videoStream = b.audioStream : b.videoStream = null, b.rtc.useVideo(b.videoStream, b.localVideo)
    }, a.verto.dialog.prototype.setMute = function(a) {
        var b = this;
        return b.rtc.setMute(a)
    }, a.verto.dialog.prototype.getMute = function() {
        var a = this;
        return a.rtc.getMute()
    }, a.verto.dialog.prototype.setVideoMute = function(a) {
        var b = this;
        return b.rtc.setVideoMute(a)
    }, a.verto.dialog.prototype.getVideoMute = function() {
        var a = this;
        return a.rtc.getVideoMute()
    }, a.verto.dialog.prototype.useStereo = function(a) {
        var b = this;
        b.params.useStereo = a, b.rtc.useStereo(a)
    }, a.verto.dialog.prototype.dtmf = function(a) {
        var b = this;
        a && b.sendMethod("verto.info", {
            dtmf: a
        })
    }, a.verto.dialog.prototype.rtt = function(a) {
        var b = this,
            c = {};
        return a ? (c.code = a.code, c.chars = a.chars, void((c.chars || c.code) && b.sendMethod("verto.info", {
            txt: a,
            noDialogParams: !0
        }))) : !1
    }, a.verto.dialog.prototype.transfer = function(a, b) {
        var c = this;
        a && c.sendMethod("verto.modify", {
            action: "transfer",
            destination: a,
            params: b
        })
    }, a.verto.dialog.prototype.replace = function(a, b) {
        var c = this;
        a && c.sendMethod("verto.modify", {
            action: "replace",
            replaceCallID: a,
            params: b
        })
    }, a.verto.dialog.prototype.hold = function(a) {
        var b = this;
        b.sendMethod("verto.modify", {
            action: "hold",
            params: a
        })
    }, a.verto.dialog.prototype.unhold = function(a) {
        var b = this;
        b.sendMethod("verto.modify", {
            action: "unhold",
            params: a
        })
    }, a.verto.dialog.prototype.toggleHold = function(a) {
        var b = this;
        b.sendMethod("verto.modify", {
            action: "toggleHold",
            params: a
        })
    }, a.verto.dialog.prototype.message = function(a) {
        var b = this,
            c = 0;
        return a.from = b.params.login, a.to || (console.error("Missing To"), c++), a.body || (console.error("Missing Body"), c++), c ? !1 : (b.sendMethod("verto.info", {
            msg: a
        }), !0)
    }, a.verto.dialog.prototype.answer = function(a) {
        var b = this;
        b.answered || (a || (a = {}), a.sdp = b.params.sdp, a && (a.useVideo && b.useVideo(!0), b.params.callee_id_name = a.callee_id_name, b.params.callee_id_number = a.callee_id_number, a.useCamera && (b.useCamera = a.useCamera), a.useMic && (b.useMic = a.useMic), a.useSpeak && (b.useSpeak = a.useSpeak)), b.rtc.createAnswer(a), b.answered = !0)
    }, a.verto.dialog.prototype.handleAnswer = function(b) {
        var c = this;
        c.gotAnswer = !0, c.state.val >= a.verto["enum"].state.active.val || (c.state.val >= a.verto["enum"].state.early.val ? c.setState(a.verto["enum"].state.active) : c.gotEarly ? console.log("Dialog " + c.callID + " Got answer while still establishing early media, delaying...") : (console.log("Dialog " + c.callID + " Answering Channel"), c.rtc.answer(b.sdp, function() {
            c.setState(a.verto["enum"].state.active)
        }, function(a) {
            console.error(a), c.hangup()
        }), console.log("Dialog " + c.callID + "ANSWER SDP", b.sdp)))
    }, a.verto.dialog.prototype.cidString = function(a) {
        var b = this,
            c = b.params.remote_caller_id_name + (a ? " &lt;" : " <") + b.params.remote_caller_id_number + (a ? "&gt;" : ">");
        return c
    }, a.verto.dialog.prototype.sendMessage = function(a, b) {
        var c = this;
        c.callbacks.onMessage && c.callbacks.onMessage(c.verto, c, a, b)
    }, a.verto.dialog.prototype.handleInfo = function(b) {
        var c = this;
        c.sendMessage(a.verto["enum"].message.info, b)
    }, a.verto.dialog.prototype.handleDisplay = function(b) {
        var c = this;
        b.display_name && (c.params.remote_caller_id_name = b.display_name), b.display_number && (c.params.remote_caller_id_number = b.display_number), c.sendMessage(a.verto["enum"].message.display, {})
    }, a.verto.dialog.prototype.handleMedia = function(b) {
        var c = this;
        c.state.val >= a.verto["enum"].state.early.val || (c.gotEarly = !0, c.rtc.answer(b.sdp, function() {
            console.log("Dialog " + c.callID + "Establishing early media"), c.setState(a.verto["enum"].state.early), c.gotAnswer && (console.log("Dialog " + c.callID + "Answering Channel"), c.setState(a.verto["enum"].state.active))
        }, function(a) {
            console.error(a), c.hangup()
        }), console.log("Dialog " + c.callID + "EARLY SDP", b.sdp))
    }, a.verto.ENUM = function(a) {
        var b = 0,
            c = {};
        return a.split(" ").map(function(a) {
            c[a] = {
                name: a,
                val: b++
            }
        }), Object.freeze(c)
    }, a.verto["enum"] = {}, a.verto["enum"].states = Object.freeze({
        "new": {
            requesting: 1,
            recovering: 1,
            ringing: 1,
            destroy: 1,
            answering: 1,
            hangup: 1
        },
        requesting: {
            trying: 1,
            hangup: 1,
            active: 1
        },
        recovering: {
            answering: 1,
            hangup: 1
        },
        trying: {
            active: 1,
            early: 1,
            hangup: 1
        },
        ringing: {
            answering: 1,
            hangup: 1
        },
        answering: {
            active: 1,
            hangup: 1
        },
        active: {
            answering: 1,
            requesting: 1,
            hangup: 1,
            held: 1
        },
        held: {
            hangup: 1,
            active: 1
        },
        early: {
            hangup: 1,
            active: 1
        },
        hangup: {
            destroy: 1
        },
        destroy: {},
        purge: {
            destroy: 1
        }
    }), a.verto["enum"].state = a.verto.ENUM("new requesting trying recovering ringing answering early active held hangup destroy purge"), a.verto["enum"].direction = a.verto.ENUM("inbound outbound"), a.verto["enum"].message = a.verto.ENUM("display info pvtEvent clientReady"), a.verto["enum"] = Object.freeze(a.verto["enum"]), a.verto.saved = [], a.verto.unloadJobs = [], a(window).bind("beforeunload", function() {
        for (var b in a.verto.unloadJobs) a.verto.unloadJobs[b]();
        if (a.verto.haltClosure) return a.verto.haltClosure();
        for (var c in a.verto.saved) {
            var d = a.verto.saved[c];
            d && (d.purge(), d.logout())
        }
        return a.verto.warnOnUnload
    }), a.verto.videoDevices = [], a.verto.audioInDevices = [], a.verto.audioOutDevices = [];
    var m = function(b) {
        function c(c) {
            for (var d = 0; d !== c.length; ++d) {
                var e = c[d],
                    j = "";
                console.log(e), console.log(e.kind + ": " + e.label + " id = " + e.deviceId), "audioinput" === e.kind ? (j = e.label || "microphone " + (g.length + 1), g.push({
                    id: e.deviceId,
                    kind: "audio_in",
                    label: j
                })) : "audiooutput" === e.kind ? (j = e.label || "speaker " + (h.length + 1), h.push({
                    id: e.deviceId,
                    kind: "audio_out",
                    label: j
                })) : "videoinput" === e.kind ? (j = e.label || "camera " + (i.length + 1), i.push({
                    id: e.deviceId,
                    kind: "video",
                    label: j
                })) : console.log("Some other kind of source/device: ", e)
            }
            a.verto.videoDevices = i, a.verto.audioInDevices = g, a.verto.audioOutDevices = h, console.info("Audio IN Devices", a.verto.audioInDevices), console.info("Audio Out Devices", a.verto.audioOutDevices), console.info("Video Devices", a.verto.videoDevices), f && f.getTracks().forEach(function(a) {
                a.stop()
            }), b && b(!0)
        }

        function d(a) {
            console.log("device enumeration error: ", a), b && b(!1)
        }

        function e(a) {
            for (var b = 0; b !== a.length; ++b) "audioinput" === a[b].kind ? k++ : "videoinput" === a[b].kind && j++;
            navigator.getUserMedia({
                audio: k > 0 ? !0 : !1,
                video: j > 0 ? !0 : !1
            }, function(a) {
                f = a, navigator.mediaDevices.enumerateDevices().then(c)["catch"](d)
            }, function(a) {
                console.log("The following error occurred: " + a.name)
            })
        }
        console.info("enumerating devices");
        var f, g = [],
            h = [],
            i = [],
            j = 0,
            k = 0;
        navigator.mediaDevices.enumerateDevices().then(e)["catch"](d)
    };
    a.verto.refreshDevices = function(a) {
        m(a)
    }, a.verto.init = function(b, c) {
        b || (b = {}), b.skipPermCheck || b.skipDeviceCheck ? b.skipPermCheck && !b.skipDeviceCheck ? m(c) : !b.skipPermCheck && b.skipDeviceCheck ? a.FSRTC.checkPerms(function(a) {
            c(a)
        }, !0, !0) : c(null) : a.FSRTC.checkPerms(function(a) {
            m(c)
        }, !0, !0)
    }, a.verto.genUUID = function() {
        return h()
    }
}(jQuery),
function(a) {
    if ("object" == typeof exports && "undefined" != typeof module) module.exports = a();
    else if ("function" == typeof define && define.amd) define([], a);
    else {
        var b;
        b = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this, b.adapter = a()
    }
}(function() {
    return function a(b, c, d) {
        function e(g, h) {
            if (!c[g]) {
                if (!b[g]) {
                    var i = "function" == typeof require && require;
                    if (!h && i) return i(g, !0);
                    if (f) return f(g, !0);
                    var j = new Error("Cannot find module '" + g + "'");
                    throw j.code = "MODULE_NOT_FOUND", j
                }
                var k = c[g] = {
                    exports: {}
                };
                b[g][0].call(k.exports, function(a) {
                    var c = b[g][1][a];
                    return e(c ? c : a)
                }, k, k.exports, a, b, c, d)
            }
            return c[g].exports
        }
        for (var f = "function" == typeof require && require, g = 0; g < d.length; g++) e(d[g]);
        return e
    }({
        1: [function(a, b, c) {
            "use strict";
            var d = {};
            d.generateIdentifier = function() {
                return Math.random().toString(36).substr(2, 10)
            }, d.localCName = d.generateIdentifier(), d.splitLines = function(a) {
                return a.trim().split("\n").map(function(a) {
                    return a.trim()
                })
            }, d.splitSections = function(a) {
                var b = a.split("\nm=");
                return b.map(function(a, b) {
                    return (b > 0 ? "m=" + a : a).trim() + "\r\n"
                })
            }, d.matchPrefix = function(a, b) {
                return d.splitLines(a).filter(function(a) {
                    return 0 === a.indexOf(b)
                })
            }, d.parseCandidate = function(a) {
                var b;
                b = 0 === a.indexOf("a=candidate:") ? a.substring(12).split(" ") : a.substring(10).split(" ");
                for (var c = {
                        foundation: b[0],
                        component: parseInt(b[1], 10),
                        protocol: b[2].toLowerCase(),
                        priority: parseInt(b[3], 10),
                        ip: b[4],
                        port: parseInt(b[5], 10),
                        type: b[7]
                    }, d = 8; d < b.length; d += 2) switch (b[d]) {
                    case "raddr":
                        c.relatedAddress = b[d + 1];
                        break;
                    case "rport":
                        c.relatedPort = parseInt(b[d + 1], 10);
                        break;
                    case "tcptype":
                        c.tcpType = b[d + 1];
                        break;
                    default:
                        c[b[d]] = b[d + 1]
                }
                return c
            }, d.writeCandidate = function(a) {
                var b = [];
                b.push(a.foundation), b.push(a.component), b.push(a.protocol.toUpperCase()), b.push(a.priority), b.push(a.ip), b.push(a.port);
                var c = a.type;
                return b.push("typ"), b.push(c), "host" !== c && a.relatedAddress && a.relatedPort && (b.push("raddr"), b.push(a.relatedAddress), b.push("rport"), b.push(a.relatedPort)), a.tcpType && "tcp" === a.protocol.toLowerCase() && (b.push("tcptype"), b.push(a.tcpType)), a.ufrag && (b.push("ufrag"), b.push(a.ufrag)), "candidate:" + b.join(" ")
            }, d.parseIceOptions = function(a) {
                return a.substr(14).split(" ")
            }, d.parseRtpMap = function(a) {
                var b = a.substr(9).split(" "),
                    c = {
                        payloadType: parseInt(b.shift(), 10)
                    };
                return b = b[0].split("/"), c.name = b[0], c.clockRate = parseInt(b[1], 10), c.numChannels = 3 === b.length ? parseInt(b[2], 10) : 1, c
            }, d.writeRtpMap = function(a) {
                var b = a.payloadType;
                return void 0 !== a.preferredPayloadType && (b = a.preferredPayloadType), "a=rtpmap:" + b + " " + a.name + "/" + a.clockRate + (1 !== a.numChannels ? "/" + a.numChannels : "") + "\r\n"
            }, d.parseExtmap = function(a) {
                var b = a.substr(9).split(" ");
                return {
                    id: parseInt(b[0], 10),
                    direction: b[0].indexOf("/") > 0 ? b[0].split("/")[1] : "sendrecv",
                    uri: b[1]
                }
            }, d.writeExtmap = function(a) {
                return "a=extmap:" + (a.id || a.preferredId) + (a.direction && "sendrecv" !== a.direction ? "/" + a.direction : "") + " " + a.uri + "\r\n"
            }, d.parseFmtp = function(a) {
                for (var b, c = {}, d = a.substr(a.indexOf(" ") + 1).split(";"), e = 0; e < d.length; e++) b = d[e].trim().split("="), c[b[0].trim()] = b[1];
                return c
            }, d.writeFmtp = function(a) {
                var b = "",
                    c = a.payloadType;
                if (void 0 !== a.preferredPayloadType && (c = a.preferredPayloadType), a.parameters && Object.keys(a.parameters).length) {
                    var d = [];
                    Object.keys(a.parameters).forEach(function(b) {
                        d.push(b + "=" + a.parameters[b])
                    }), b += "a=fmtp:" + c + " " + d.join(";") + "\r\n"
                }
                return b
            }, d.parseRtcpFb = function(a) {
                var b = a.substr(a.indexOf(" ") + 1).split(" ");
                return {
                    type: b.shift(),
                    parameter: b.join(" ")
                }
            }, d.writeRtcpFb = function(a) {
                var b = "",
                    c = a.payloadType;
                return void 0 !== a.preferredPayloadType && (c = a.preferredPayloadType), a.rtcpFeedback && a.rtcpFeedback.length && a.rtcpFeedback.forEach(function(a) {
                    b += "a=rtcp-fb:" + c + " " + a.type + (a.parameter && a.parameter.length ? " " + a.parameter : "") + "\r\n"
                }), b
            }, d.parseSsrcMedia = function(a) {
                var b = a.indexOf(" "),
                    c = {
                        ssrc: parseInt(a.substr(7, b - 7), 10)
                    },
                    d = a.indexOf(":", b);
                return d > -1 ? (c.attribute = a.substr(b + 1, d - b - 1), c.value = a.substr(d + 1)) : c.attribute = a.substr(b + 1), c
            }, d.getMid = function(a) {
                var b = d.matchPrefix(a, "a=mid:")[0];
                return b ? b.substr(6) : void 0
            }, d.parseFingerprint = function(a) {
                var b = a.substr(14).split(" ");
                return {
                    algorithm: b[0].toLowerCase(),
                    value: b[1]
                }
            }, d.getDtlsParameters = function(a, b) {
                var c = d.matchPrefix(a + b, "a=fingerprint:");
                return {
                    role: "auto",
                    fingerprints: c.map(d.parseFingerprint)
                }
            }, d.writeDtlsParameters = function(a, b) {
                var c = "a=setup:" + b + "\r\n";
                return a.fingerprints.forEach(function(a) {
                    c += "a=fingerprint:" + a.algorithm + " " + a.value + "\r\n"
                }), c
            }, d.getIceParameters = function(a, b) {
                var c = d.splitLines(a);
                c = c.concat(d.splitLines(b));
                var e = {
                    usernameFragment: c.filter(function(a) {
                        return 0 === a.indexOf("a=ice-ufrag:")
                    })[0].substr(12),
                    password: c.filter(function(a) {
                        return 0 === a.indexOf("a=ice-pwd:")
                    })[0].substr(10)
                };
                return e
            }, d.writeIceParameters = function(a) {
                return "a=ice-ufrag:" + a.usernameFragment + "\r\na=ice-pwd:" + a.password + "\r\n"
            }, d.parseRtpParameters = function(a) {
                for (var b = {
                        codecs: [],
                        headerExtensions: [],
                        fecMechanisms: [],
                        rtcp: []
                    }, c = d.splitLines(a), e = c[0].split(" "), f = 3; f < e.length; f++) {
                    var g = e[f],
                        h = d.matchPrefix(a, "a=rtpmap:" + g + " ")[0];
                    if (h) {
                        var i = d.parseRtpMap(h),
                            j = d.matchPrefix(a, "a=fmtp:" + g + " ");
                        switch (i.parameters = j.length ? d.parseFmtp(j[0]) : {}, i.rtcpFeedback = d.matchPrefix(a, "a=rtcp-fb:" + g + " ").map(d.parseRtcpFb), b.codecs.push(i), i.name.toUpperCase()) {
                            case "RED":
                            case "ULPFEC":
                                b.fecMechanisms.push(i.name.toUpperCase())
                        }
                    }
                }
                return d.matchPrefix(a, "a=extmap:").forEach(function(a) {
                    b.headerExtensions.push(d.parseExtmap(a))
                }), b
            }, d.writeRtpDescription = function(a, b) {
                var c = "";
                c += "m=" + a + " ", c += b.codecs.length > 0 ? "9" : "0", c += " UDP/TLS/RTP/SAVPF ", c += b.codecs.map(function(a) {
                    return void 0 !== a.preferredPayloadType ? a.preferredPayloadType : a.payloadType
                }).join(" ") + "\r\n", c += "c=IN IP4 0.0.0.0\r\n", c += "a=rtcp:9 IN IP4 0.0.0.0\r\n", b.codecs.forEach(function(a) {
                    c += d.writeRtpMap(a), c += d.writeFmtp(a), c += d.writeRtcpFb(a)
                });
                var e = 0;
                return b.codecs.forEach(function(a) {
                    a.maxptime > e && (e = a.maxptime)
                }), e > 0 && (c += "a=maxptime:" + e + "\r\n"), c += "a=rtcp-mux\r\n", b.headerExtensions.forEach(function(a) {
                    c += d.writeExtmap(a)
                }), c
            }, d.parseRtpEncodingParameters = function(a) {
                var b, c = [],
                    e = d.parseRtpParameters(a),
                    f = -1 !== e.fecMechanisms.indexOf("RED"),
                    g = -1 !== e.fecMechanisms.indexOf("ULPFEC"),
                    h = d.matchPrefix(a, "a=ssrc:").map(function(a) {
                        return d.parseSsrcMedia(a)
                    }).filter(function(a) {
                        return "cname" === a.attribute
                    }),
                    i = h.length > 0 && h[0].ssrc,
                    j = d.matchPrefix(a, "a=ssrc-group:FID").map(function(a) {
                        var b = a.split(" ");
                        return b.shift(), b.map(function(a) {
                            return parseInt(a, 10)
                        })
                    });
                j.length > 0 && j[0].length > 1 && j[0][0] === i && (b = j[0][1]), e.codecs.forEach(function(a) {
                    if ("RTX" === a.name.toUpperCase() && a.parameters.apt) {
                        var d = {
                            ssrc: i,
                            codecPayloadType: parseInt(a.parameters.apt, 10),
                            rtx: {
                                ssrc: b
                            }
                        };
                        c.push(d), f && (d = JSON.parse(JSON.stringify(d)), d.fec = {
                            ssrc: b,
                            mechanism: g ? "red+ulpfec" : "red"
                        }, c.push(d))
                    }
                }), 0 === c.length && i && c.push({
                    ssrc: i
                });
                var k = d.matchPrefix(a, "b=");
                return k.length && (k = 0 === k[0].indexOf("b=TIAS:") ? parseInt(k[0].substr(7), 10) : 0 === k[0].indexOf("b=AS:") ? 1e3 * parseInt(k[0].substr(5), 10) * .95 - 16e3 : void 0, c.forEach(function(a) {
                    a.maxBitrate = k
                })), c
            }, d.parseRtcpParameters = function(a) {
                var b = {},
                    c = d.matchPrefix(a, "a=ssrc:").map(function(a) {
                        return d.parseSsrcMedia(a)
                    }).filter(function(a) {
                        return "cname" === a.attribute
                    })[0];
                c && (b.cname = c.value, b.ssrc = c.ssrc);
                var e = d.matchPrefix(a, "a=rtcp-rsize");
                b.reducedSize = e.length > 0, b.compound = 0 === e.length;
                var f = d.matchPrefix(a, "a=rtcp-mux");
                return b.mux = f.length > 0, b
            }, d.parseMsid = function(a) {
                var b, c = d.matchPrefix(a, "a=msid:");
                if (1 === c.length) return b = c[0].substr(7).split(" "), {
                    stream: b[0],
                    track: b[1]
                };
                var e = d.matchPrefix(a, "a=ssrc:").map(function(a) {
                    return d.parseSsrcMedia(a)
                }).filter(function(a) {
                    return "msid" === a.attribute
                });
                return e.length > 0 ? (b = e[0].value.split(" "), {
                    stream: b[0],
                    track: b[1]
                }) : void 0
            }, d.generateSessionId = function() {
                return Math.random().toString().substr(2, 21)
            }, d.writeSessionBoilerplate = function(a) {
                var b;
                return b = a ? a : d.generateSessionId(), "v=0\r\no=thisisadapterortc " + b + " 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"
            }, d.writeMediaSection = function(a, b, c, e) {
                var f = d.writeRtpDescription(a.kind, b);
                if (f += d.writeIceParameters(a.iceGatherer.getLocalParameters()), f += d.writeDtlsParameters(a.dtlsTransport.getLocalParameters(), "offer" === c ? "actpass" : "active"), f += "a=mid:" + a.mid + "\r\n", f += a.direction ? "a=" + a.direction + "\r\n" : a.rtpSender && a.rtpReceiver ? "a=sendrecv\r\n" : a.rtpSender ? "a=sendonly\r\n" : a.rtpReceiver ? "a=recvonly\r\n" : "a=inactive\r\n", a.rtpSender) {
                    var g = "msid:" + e.id + " " + a.rtpSender.track.id + "\r\n";
                    f += "a=" + g, f += "a=ssrc:" + a.sendEncodingParameters[0].ssrc + " " + g, a.sendEncodingParameters[0].rtx && (f += "a=ssrc:" + a.sendEncodingParameters[0].rtx.ssrc + " " + g, f += "a=ssrc-group:FID " + a.sendEncodingParameters[0].ssrc + " " + a.sendEncodingParameters[0].rtx.ssrc + "\r\n")
                }
                return f += "a=ssrc:" + a.sendEncodingParameters[0].ssrc + " cname:" + d.localCName + "\r\n", a.rtpSender && a.sendEncodingParameters[0].rtx && (f += "a=ssrc:" + a.sendEncodingParameters[0].rtx.ssrc + " cname:" + d.localCName + "\r\n"), f
            }, d.getDirection = function(a, b) {
                for (var c = d.splitLines(a), e = 0; e < c.length; e++) switch (c[e]) {
                    case "a=sendrecv":
                    case "a=sendonly":
                    case "a=recvonly":
                    case "a=inactive":
                        return c[e].substr(2)
                }
                return b ? d.getDirection(b) : "sendrecv"
            }, d.getKind = function(a) {
                var b = d.splitLines(a),
                    c = b[0].split(" ");
                return c[0].substr(2)
            }, d.isRejected = function(a) {
                return "0" === a.split(" ", 2)[1]
            }, b.exports = d
        }, {}],
        2: [function(a, b, c) {
            (function(c) {
                "use strict";
                var d = a("./adapter_factory.js");
                b.exports = d({
                    window: c.window
                })
            }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {})
        }, {
            "./adapter_factory.js": 3
        }],
        3: [function(a, b, c) {
            "use strict";
            b.exports = function(b) {
                var c = b && b.window,
                    d = a("./utils"),
                    e = d.log,
                    f = d.detectBrowser(c),
                    g = {
                        browserDetails: f,
                        extractVersion: d.extractVersion,
                        disableLog: d.disableLog,
                        disableWarnings: d.disableWarnings
                    },
                    h = a("./chrome/chrome_shim") || null,
                    i = a("./edge/edge_shim") || null,
                    j = a("./firefox/firefox_shim") || null,
                    k = a("./safari/safari_shim") || null;
                switch (f.browser) {
                    case "chrome":
                        if (!h || !h.shimPeerConnection) return e("Chrome shim is not included in this adapter release."), g;
                        e("adapter.js shimming chrome."), g.browserShim = h, h.shimGetUserMedia(c), h.shimMediaStream(c), d.shimCreateObjectURL(c), h.shimSourceObject(c), h.shimPeerConnection(c), h.shimOnTrack(c), h.shimGetSendersWithDtmf(c);
                        break;
                    case "firefox":
                        if (!j || !j.shimPeerConnection) return e("Firefox shim is not included in this adapter release."), g;
                        e("adapter.js shimming firefox."), g.browserShim = j, j.shimGetUserMedia(c), d.shimCreateObjectURL(c), j.shimSourceObject(c), j.shimPeerConnection(c), j.shimOnTrack(c);
                        break;
                    case "edge":
                        if (!i || !i.shimPeerConnection) return e("MS edge shim is not included in this adapter release."), g;
                        e("adapter.js shimming edge."), g.browserShim = i, i.shimGetUserMedia(c), d.shimCreateObjectURL(c), i.shimPeerConnection(c), i.shimReplaceTrack(c);
                        break;
                    case "safari":
                        if (!k) return e("Safari shim is not included in this adapter release."), g;
                        e("adapter.js shimming safari."), g.browserShim = k, d.shimCreateObjectURL(c), k.shimRTCIceServerUrls(c), k.shimCallbacksAPI(c), k.shimLocalStreamsAPI(c), k.shimRemoteStreamsAPI(c), k.shimGetUserMedia(c);
                        break;
                    default:
                        e("Unsupported browser!")
                }
                return g
            }
        }, {
            "./chrome/chrome_shim": 4,
            "./edge/edge_shim": 6,
            "./firefox/firefox_shim": 9,
            "./safari/safari_shim": 11,
            "./utils": 12
        }],
        4: [function(a, b, c) {
            "use strict";
            var d = a("../utils.js"),
                e = d.log,
                f = {
                    shimMediaStream: function(a) {
                        a.MediaStream = a.MediaStream || a.webkitMediaStream
                    },
                    shimOnTrack: function(a) {
                        "object" != typeof a || !a.RTCPeerConnection || "ontrack" in a.RTCPeerConnection.prototype || Object.defineProperty(a.RTCPeerConnection.prototype, "ontrack", {
                            get: function() {
                                return this._ontrack
                            },
                            set: function(b) {
                                var c = this;
                                this._ontrack && (this.removeEventListener("track", this._ontrack), this.removeEventListener("addstream", this._ontrackpoly)), this.addEventListener("track", this._ontrack = b), this.addEventListener("addstream", this._ontrackpoly = function(b) {
                                    b.stream.addEventListener("addtrack", function(d) {
                                        var e;
                                        e = a.RTCPeerConnection.prototype.getReceivers ? c.getReceivers().find(function(a) {
                                            return a.track.id === d.track.id
                                        }) : {
                                            track: d.track
                                        };
                                        var f = new Event("track");
                                        f.track = d.track, f.receiver = e, f.streams = [b.stream], c.dispatchEvent(f)
                                    }), b.stream.getTracks().forEach(function(d) {
                                        var e;
                                        e = a.RTCPeerConnection.prototype.getReceivers ? c.getReceivers().find(function(a) {
                                            return a.track.id === d.id
                                        }) : {
                                            track: d
                                        };
                                        var f = new Event("track");
                                        f.track = d, f.receiver = e, f.streams = [b.stream], this.dispatchEvent(f)
                                    }.bind(this))
                                }.bind(this))
                            }
                        })
                    },
                    shimGetSendersWithDtmf: function(a) {
                        if ("object" == typeof a && a.RTCPeerConnection && !("getSenders" in a.RTCPeerConnection.prototype) && "createDTMFSender" in a.RTCPeerConnection.prototype) {
                            a.RTCPeerConnection.prototype.getSenders = function() {
                                return this._senders || []
                            };
                            var b = a.RTCPeerConnection.prototype.addStream,
                                c = a.RTCPeerConnection.prototype.removeStream;
                            a.RTCPeerConnection.prototype.addTrack || (a.RTCPeerConnection.prototype.addTrack = function(b, c) {
                                var d = this;
                                if ("closed" === d.signalingState) throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.", "InvalidStateError");
                                var e = [].slice.call(arguments, 1);
                                if (1 !== e.length || !e[0].getTracks().find(function(a) {
                                        return a === b
                                    })) throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.", "NotSupportedError");
                                d._senders = d._senders || [];
                                var f = d._senders.find(function(a) {
                                    return a.track === b
                                });
                                if (f) throw new DOMException("Track already exists.", "InvalidAccessError");
                                d._streams = d._streams || {};
                                var g = d._streams[c.id];
                                if (g) g.addTrack(b), d.removeStream(g), d.addStream(g);
                                else {
                                    var h = new a.MediaStream([b]);
                                    d._streams[c.id] = h, d.addStream(h)
                                }
                                var i = {
                                    track: b,
                                    get dtmf() {
                                        return void 0 === this._dtmf && ("audio" === b.kind ? this._dtmf = d.createDTMFSender(b) : this._dtmf = null), this._dtmf
                                    }
                                };
                                return d._senders.push(i), i
                            }), a.RTCPeerConnection.prototype.addStream = function(a) {
                                var c = this;
                                c._senders = c._senders || [], b.apply(c, [a]), a.getTracks().forEach(function(a) {
                                    c._senders.push({
                                        track: a,
                                        get dtmf() {
                                            return void 0 === this._dtmf && ("audio" === a.kind ? this._dtmf = c.createDTMFSender(a) : this._dtmf = null), this._dtmf
                                        }
                                    })
                                })
                            }, a.RTCPeerConnection.prototype.removeStream = function(a) {
                                var b = this;
                                b._senders = b._senders || [], c.apply(b, [a]), a.getTracks().forEach(function(a) {
                                    var c = b._senders.find(function(b) {
                                        return b.track === a
                                    });
                                    c && b._senders.splice(b._senders.indexOf(c), 1)
                                })
                            }
                        } else if ("object" == typeof a && a.RTCPeerConnection && "getSenders" in a.RTCPeerConnection.prototype && "createDTMFSender" in a.RTCPeerConnection.prototype && a.RTCRtpSender && !("dtmf" in a.RTCRtpSender.prototype)) {
                            var d = a.RTCPeerConnection.prototype.getSenders;
                            a.RTCPeerConnection.prototype.getSenders = function() {
                                var a = this,
                                    b = d.apply(a, []);
                                return b.forEach(function(b) {
                                    b._pc = a
                                }), b
                            }, Object.defineProperty(a.RTCRtpSender.prototype, "dtmf", {
                                get: function() {
                                    return void 0 === this._dtmf && ("audio" === this.track.kind ? this._dtmf = this._pc.createDTMFSender(this.track) : this._dtmf = null), this._dtmf
                                }
                            })
                        }
                    },
                    shimSourceObject: function(a) {
                        var b = a && a.URL;
                        "object" == typeof a && (!a.HTMLMediaElement || "srcObject" in a.HTMLMediaElement.prototype || Object.defineProperty(a.HTMLMediaElement.prototype, "srcObject", {
                            get: function() {
                                return this._srcObject
                            },
                            set: function(a) {
                                var c = this;
                                return this._srcObject = a, this.src && b.revokeObjectURL(this.src), a ? (this.src = b.createObjectURL(a), a.addEventListener("addtrack", function() {
                                    c.src && b.revokeObjectURL(c.src), c.src = b.createObjectURL(a)
                                }), void a.addEventListener("removetrack", function() {
                                    c.src && b.revokeObjectURL(c.src), c.src = b.createObjectURL(a)
                                })) : void(this.src = "")
                            }
                        }))
                    },
                    shimPeerConnection: function(a) {
                        var b = d.detectBrowser(a);
                        if (a.RTCPeerConnection) {
                            var c = a.RTCPeerConnection;
                            a.RTCPeerConnection = function(a, b) {
                                if (a && a.iceServers) {
                                    for (var d = [], e = 0; e < a.iceServers.length; e++) {
                                        var f = a.iceServers[e];
                                        !f.hasOwnProperty("urls") && f.hasOwnProperty("url") ? (console.warn("RTCIceServer.url is deprecated! Use urls instead."), f = JSON.parse(JSON.stringify(f)), f.urls = f.url, d.push(f)) : d.push(a.iceServers[e])
                                    }
                                    a.iceServers = d
                                }
                                return new c(a, b)
                            }, a.RTCPeerConnection.prototype = c.prototype, Object.defineProperty(a.RTCPeerConnection, "generateCertificate", {
                                get: function() {
                                    return c.generateCertificate
                                }
                            })
                        } else a.RTCPeerConnection = function(b, c) {
                            return e("PeerConnection"), b && b.iceTransportPolicy && (b.iceTransports = b.iceTransportPolicy), new a.webkitRTCPeerConnection(b, c)
                        }, a.RTCPeerConnection.prototype = a.webkitRTCPeerConnection.prototype, a.webkitRTCPeerConnection.generateCertificate && Object.defineProperty(a.RTCPeerConnection, "generateCertificate", {
                            get: function() {
                                return a.webkitRTCPeerConnection.generateCertificate
                            }
                        });
                        var f = a.RTCPeerConnection.prototype.getStats;
                        a.RTCPeerConnection.prototype.getStats = function(a, b, c) {
                            var d = this,
                                e = arguments;
                            if (arguments.length > 0 && "function" == typeof a) return f.apply(this, arguments);
                            if (0 === f.length && (0 === arguments.length || "function" != typeof arguments[0])) return f.apply(this, []);
                            var g = function(a) {
                                    var b = {},
                                        c = a.result();
                                    return c.forEach(function(a) {
                                        var c = {
                                            id: a.id,
                                            timestamp: a.timestamp,
                                            type: {
                                                localcandidate: "local-candidate",
                                                remotecandidate: "remote-candidate"
                                            }[a.type] || a.type
                                        };
                                        a.names().forEach(function(b) {
                                            c[b] = a.stat(b)
                                        }), b[c.id] = c
                                    }), b
                                },
                                h = function(a) {
                                    return new Map(Object.keys(a).map(function(b) {
                                        return [b, a[b]]
                                    }))
                                };
                            if (arguments.length >= 2) {
                                var i = function(a) {
                                    e[1](h(g(a)))
                                };
                                return f.apply(this, [i, arguments[0]])
                            }
                            return new Promise(function(a, b) {
                                f.apply(d, [function(b) {
                                    a(h(g(b)))
                                }, b])
                            }).then(b, c)
                        }, b.version < 51 && ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(b) {
                            var c = a.RTCPeerConnection.prototype[b];
                            a.RTCPeerConnection.prototype[b] = function() {
                                var a = arguments,
                                    b = this,
                                    d = new Promise(function(d, e) {
                                        c.apply(b, [a[0], d, e])
                                    });
                                return a.length < 2 ? d : d.then(function() {
                                    a[1].apply(null, [])
                                }, function(b) {
                                    a.length >= 3 && a[2].apply(null, [b])
                                })
                            }
                        }), b.version < 52 && ["createOffer", "createAnswer"].forEach(function(b) {
                            var c = a.RTCPeerConnection.prototype[b];
                            a.RTCPeerConnection.prototype[b] = function() {
                                var a = this;
                                if (arguments.length < 1 || 1 === arguments.length && "object" == typeof arguments[0]) {
                                    var b = 1 === arguments.length ? arguments[0] : void 0;
                                    return new Promise(function(d, e) {
                                        c.apply(a, [d, e, b])
                                    })
                                }
                                return c.apply(this, arguments)
                            }
                        }), ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(b) {
                            var c = a.RTCPeerConnection.prototype[b];
                            a.RTCPeerConnection.prototype[b] = function() {
                                return arguments[0] = new("addIceCandidate" === b ? a.RTCIceCandidate : a.RTCSessionDescription)(arguments[0]), c.apply(this, arguments)
                            }
                        });
                        var g = a.RTCPeerConnection.prototype.addIceCandidate;
                        a.RTCPeerConnection.prototype.addIceCandidate = function() {
                            return arguments[0] ? g.apply(this, arguments) : (arguments[1] && arguments[1].apply(null), Promise.resolve())
                        }
                    }
                };
            b.exports = {
                shimMediaStream: f.shimMediaStream,
                shimOnTrack: f.shimOnTrack,
                shimGetSendersWithDtmf: f.shimGetSendersWithDtmf,
                shimSourceObject: f.shimSourceObject,
                shimPeerConnection: f.shimPeerConnection,
                shimGetUserMedia: a("./getusermedia")
            }
        }, {
            "../utils.js": 12,
            "./getusermedia": 5
        }],
        5: [function(a, b, c) {
            "use strict";
            var d = a("../utils.js"),
                e = d.log;
            b.exports = function(a) {
                var b = d.detectBrowser(a),
                    c = a && a.navigator,
                    f = function(a) {
                        if ("object" != typeof a || a.mandatory || a.optional) return a;
                        var b = {};
                        return Object.keys(a).forEach(function(c) {
                            if ("require" !== c && "advanced" !== c && "mediaSource" !== c) {
                                var d = "object" == typeof a[c] ? a[c] : {
                                    ideal: a[c]
                                };
                                void 0 !== d.exact && "number" == typeof d.exact && (d.min = d.max = d.exact);
                                var e = function(a, b) {
                                    return a ? a + b.charAt(0).toUpperCase() + b.slice(1) : "deviceId" === b ? "sourceId" : b
                                };
                                if (void 0 !== d.ideal) {
                                    b.optional = b.optional || [];
                                    var f = {};
                                    "number" == typeof d.ideal ? (f[e("min", c)] = d.ideal, b.optional.push(f), f = {}, f[e("max", c)] = d.ideal, b.optional.push(f)) : (f[e("", c)] = d.ideal, b.optional.push(f))
                                }
                                void 0 !== d.exact && "number" != typeof d.exact ? (b.mandatory = b.mandatory || {}, b.mandatory[e("", c)] = d.exact) : ["min", "max"].forEach(function(a) {
                                    void 0 !== d[a] && (b.mandatory = b.mandatory || {}, b.mandatory[e(a, c)] = d[a])
                                })
                            }
                        }), a.advanced && (b.optional = (b.optional || []).concat(a.advanced)), b
                    },
                    g = function(a, d) {
                        if (a = JSON.parse(JSON.stringify(a)), a && "object" == typeof a.audio) {
                            var g = function(a, b, c) {
                                b in a && !(c in a) && (a[c] = a[b], delete a[b])
                            };
                            a = JSON.parse(JSON.stringify(a)), g(a.audio, "autoGainControl", "googAutoGainControl"), g(a.audio, "noiseSuppression", "googNoiseSuppression"), a.audio = f(a.audio)
                        }
                        if (a && "object" == typeof a.video) {
                            var h = a.video.facingMode;
                            h = h && ("object" == typeof h ? h : {
                                ideal: h
                            });
                            var i = b.version < 61;
                            if (h && ("user" === h.exact || "environment" === h.exact || "user" === h.ideal || "environment" === h.ideal) && (!c.mediaDevices.getSupportedConstraints || !c.mediaDevices.getSupportedConstraints().facingMode || i)) {
                                delete a.video.facingMode;
                                var j;
                                if ("environment" === h.exact || "environment" === h.ideal ? j = ["back", "rear"] : ("user" === h.exact || "user" === h.ideal) && (j = ["front"]), j) return c.mediaDevices.enumerateDevices().then(function(b) {
                                    b = b.filter(function(a) {
                                        return "videoinput" === a.kind
                                    });
                                    var c = b.find(function(a) {
                                        return j.some(function(b) {
                                            return -1 !== a.label.toLowerCase().indexOf(b)
                                        })
                                    });
                                    return !c && b.length && -1 !== j.indexOf("back") && (c = b[b.length - 1]), c && (a.video.deviceId = h.exact ? {
                                        exact: c.deviceId
                                    } : {
                                        ideal: c.deviceId
                                    }), a.video = f(a.video), e("chrome: " + JSON.stringify(a)), d(a)
                                })
                            }
                            a.video = f(a.video)
                        }
                        return e("chrome: " + JSON.stringify(a)), d(a)
                    },
                    h = function(a) {
                        return {
                            name: {
                                PermissionDeniedError: "NotAllowedError",
                                InvalidStateError: "NotReadableError",
                                DevicesNotFoundError: "NotFoundError",
                                ConstraintNotSatisfiedError: "OverconstrainedError",
                                TrackStartError: "NotReadableError",
                                MediaDeviceFailedDueToShutdown: "NotReadableError",
                                MediaDeviceKillSwitchOn: "NotReadableError"
                            }[a.name] || a.name,
                            message: a.message,
                            constraint: a.constraintName,
                            toString: function() {
                                return this.name + (this.message && ": ") + this.message
                            }
                        }
                    },
                    i = function(a, b, d) {
                        g(a, function(a) {
                            c.webkitGetUserMedia(a, b, function(a) {
                                d(h(a))
                            })
                        })
                    };
                c.getUserMedia = i;
                var j = function(a) {
                    return new Promise(function(b, d) {
                        c.getUserMedia(a, b, d)
                    })
                };
                if (c.mediaDevices || (c.mediaDevices = {
                        getUserMedia: j,
                        enumerateDevices: function() {
                            return new Promise(function(b) {
                                var c = {
                                    audio: "audioinput",
                                    video: "videoinput"
                                };
                                return a.MediaStreamTrack.getSources(function(a) {
                                    b(a.map(function(a) {
                                        return {
                                            label: a.label,
                                            kind: c[a.kind],
                                            deviceId: a.id,
                                            groupId: ""
                                        }
                                    }))
                                })
                            })
                        },
                        getSupportedConstraints: function() {
                            return {
                                deviceId: !0,
                                echoCancellation: !0,
                                facingMode: !0,
                                frameRate: !0,
                                height: !0,
                                width: !0
                            }
                        }
                    }), c.mediaDevices.getUserMedia) {
                    var k = c.mediaDevices.getUserMedia.bind(c.mediaDevices);
                    c.mediaDevices.getUserMedia = function(a) {
                        return g(a, function(a) {
                            return k(a).then(function(b) {
                                if (a.audio && !b.getAudioTracks().length || a.video && !b.getVideoTracks().length) throw b.getTracks().forEach(function(a) {
                                    a.stop()
                                }), new DOMException("", "NotFoundError");
                                return b
                            }, function(a) {
                                return Promise.reject(h(a))
                            })
                        })
                    }
                } else c.mediaDevices.getUserMedia = function(a) {
                    return j(a)
                };
                "undefined" == typeof c.mediaDevices.addEventListener && (c.mediaDevices.addEventListener = function() {
                    e("Dummy mediaDevices.addEventListener called.")
                }), "undefined" == typeof c.mediaDevices.removeEventListener && (c.mediaDevices.removeEventListener = function() {
                    e("Dummy mediaDevices.removeEventListener called.")
                })
            }
        }, {
            "../utils.js": 12
        }],
        6: [function(a, b, c) {
            "use strict";
            var d = a("../utils"),
                e = a("./rtcpeerconnection_shim");
            b.exports = {
                shimGetUserMedia: a("./getusermedia"),
                shimPeerConnection: function(a) {
                    var b = d.detectBrowser(a);
                    if (a.RTCIceGatherer && (a.RTCIceCandidate || (a.RTCIceCandidate = function(a) {
                            return a
                        }), a.RTCSessionDescription || (a.RTCSessionDescription = function(a) {
                            return a
                        }), b.version < 15025)) {
                        var c = Object.getOwnPropertyDescriptor(a.MediaStreamTrack.prototype, "enabled");
                        Object.defineProperty(a.MediaStreamTrack.prototype, "enabled", {
                            set: function(a) {
                                c.set.call(this, a);
                                var b = new Event("enabled");
                                b.enabled = a, this.dispatchEvent(b)
                            }
                        })
                    }
                    a.RTCPeerConnection = e(a, b.version)
                },
                shimReplaceTrack: function(a) {
                    !a.RTCRtpSender || "replaceTrack" in a.RTCRtpSender.prototype || (a.RTCRtpSender.prototype.replaceTrack = a.RTCRtpSender.prototype.setTrack)
                }
            }
        }, {
            "../utils": 12,
            "./getusermedia": 7,
            "./rtcpeerconnection_shim": 8
        }],
        7: [function(a, b, c) {
            "use strict";
            b.exports = function(a) {
                var b = a && a.navigator,
                    c = function(a) {
                        return {
                            name: {
                                PermissionDeniedError: "NotAllowedError"
                            }[a.name] || a.name,
                            message: a.message,
                            constraint: a.constraint,
                            toString: function() {
                                return this.name
                            }
                        }
                    },
                    d = b.mediaDevices.getUserMedia.bind(b.mediaDevices);
                b.mediaDevices.getUserMedia = function(a) {
                    return d(a)["catch"](function(a) {
                        return Promise.reject(c(a))
                    })
                }
            }
        }, {}],
        8: [function(a, b, c) {
            "use strict";

            function d(a) {
                var b = a.filter(function(a) {
                        return "audio" === a.kind
                    }),
                    c = a.filter(function(a) {
                        return "video" === a.kind
                    });
                for (a = []; b.length || c.length;) b.length && a.push(b.shift()), c.length && a.push(c.shift());
                return a
            }

            function e(a, b) {
                var c = !1;
                return a = JSON.parse(JSON.stringify(a)), a.filter(function(a) {
                    if (a && (a.urls || a.url)) {
                        var d = a.urls || a.url;
                        a.url && !a.urls && console.warn("RTCIceServer.url is deprecated! Use urls instead.");
                        var e = "string" == typeof d;
                        return e && (d = [d]), d = d.filter(function(a) {
                            var d = 0 === a.indexOf("turn:") && -1 !== a.indexOf("transport=udp") && -1 === a.indexOf("turn:[") && !c;
                            return d ? (c = !0, !0) : 0 === a.indexOf("stun:") && b >= 14393
                        }), delete a.url, a.urls = e ? d[0] : d, !!d.length
                    }
                    return !1
                })
            }

            function f(a, b) {
                var c = {
                        codecs: [],
                        headerExtensions: [],
                        fecMechanisms: []
                    },
                    d = function(a, b) {
                        a = parseInt(a, 10);
                        for (var c = 0; c < b.length; c++)
                            if (b[c].payloadType === a || b[c].preferredPayloadType === a) return b[c]
                    },
                    e = function(a, b, c, e) {
                        var f = d(a.parameters.apt, c),
                            g = d(b.parameters.apt, e);
                        return f && g && f.name.toLowerCase() === g.name.toLowerCase()
                    };
                return a.codecs.forEach(function(d) {
                    for (var f = 0; f < b.codecs.length; f++) {
                        var g = b.codecs[f];
                        if (d.name.toLowerCase() === g.name.toLowerCase() && d.clockRate === g.clockRate) {
                            if ("rtx" === d.name.toLowerCase() && d.parameters && g.parameters.apt && !e(d, g, a.codecs, b.codecs)) continue;
                            g = JSON.parse(JSON.stringify(g)), g.numChannels = Math.min(d.numChannels, g.numChannels), c.codecs.push(g), g.rtcpFeedback = g.rtcpFeedback.filter(function(a) {
                                for (var b = 0; b < d.rtcpFeedback.length; b++)
                                    if (d.rtcpFeedback[b].type === a.type && d.rtcpFeedback[b].parameter === a.parameter) return !0;
                                return !1
                            });
                            break
                        }
                    }
                }), a.headerExtensions.forEach(function(a) {
                    for (var d = 0; d < b.headerExtensions.length; d++) {
                        var e = b.headerExtensions[d];
                        if (a.uri === e.uri) {
                            c.headerExtensions.push(e);
                            break
                        }
                    }
                }), c
            }

            function g(a, b, c) {
                return -1 !== {
                    offer: {
                        setLocalDescription: ["stable", "have-local-offer"],
                        setRemoteDescription: ["stable", "have-remote-offer"]
                    },
                    answer: {
                        setLocalDescription: ["have-remote-offer", "have-local-pranswer"],
                        setRemoteDescription: ["have-local-offer", "have-remote-pranswer"]
                    }
                }[b][a].indexOf(c)
            }
            var h = a("sdp");
            b.exports = function(a, b) {
                var c = function(c) {
                    var d = this,
                        f = document.createDocumentFragment();
                    if (["addEventListener", "removeEventListener", "dispatchEvent"].forEach(function(a) {
                            d[a] = f[a].bind(f)
                        }), this.needNegotiation = !1, this.onicecandidate = null, this.onaddstream = null, this.ontrack = null, this.onremovestream = null, this.onsignalingstatechange = null, this.oniceconnectionstatechange = null, this.onicegatheringstatechange = null, this.onnegotiationneeded = null, this.ondatachannel = null, this.canTrickleIceCandidates = null, this.localStreams = [], this.remoteStreams = [], this.getLocalStreams = function() {
                            return d.localStreams
                        }, this.getRemoteStreams = function() {
                            return d.remoteStreams
                        }, this.localDescription = new a.RTCSessionDescription({
                            type: "",
                            sdp: ""
                        }), this.remoteDescription = new a.RTCSessionDescription({
                            type: "",
                            sdp: ""
                        }), this.signalingState = "stable", this.iceConnectionState = "new", this.iceGatheringState = "new", this.iceOptions = {
                            gatherPolicy: "all",
                            iceServers: []
                        }, c && c.iceTransportPolicy) switch (c.iceTransportPolicy) {
                        case "all":
                        case "relay":
                            this.iceOptions.gatherPolicy = c.iceTransportPolicy
                    }
                    this.usingBundle = c && "max-bundle" === c.bundlePolicy, c && c.iceServers && (this.iceOptions.iceServers = e(c.iceServers, b)), this._config = c || {}, this.transceivers = [], this._localIceCandidatesBuffer = [], this._sdpSessionId = h.generateSessionId()
                };
                return c.prototype._emitGatheringStateChange = function() {
                    var a = new Event("icegatheringstatechange");
                    this.dispatchEvent(a), null !== this.onicegatheringstatechange && this.onicegatheringstatechange(a)
                }, c.prototype._emitBufferedCandidates = function() {
                    var a = this,
                        b = h.splitSections(a.localDescription.sdp);
                    this._localIceCandidatesBuffer.forEach(function(c) {
                        var d = !c.candidate || 0 === Object.keys(c.candidate).length;
                        if (d)
                            for (var e = 1; e < b.length; e++) - 1 === b[e].indexOf("\r\na=end-of-candidates\r\n") && (b[e] += "a=end-of-candidates\r\n");
                        else b[c.candidate.sdpMLineIndex + 1] += "a=" + c.candidate.candidate + "\r\n";
                        if (a.localDescription.sdp = b.join(""), a.dispatchEvent(c), null !== a.onicecandidate && a.onicecandidate(c), !c.candidate && "complete" !== a.iceGatheringState) {
                            var f = a.transceivers.every(function(a) {
                                return a.iceGatherer && "completed" === a.iceGatherer.state
                            });
                            f && "complete" !== a.iceGatheringStateChange && (a.iceGatheringState = "complete", a._emitGatheringStateChange())
                        }
                    }), this._localIceCandidatesBuffer = []
                }, c.prototype.getConfiguration = function() {
                    return this._config
                }, c.prototype._createTransceiver = function(a) {
                    var b = this.transceivers.length > 0,
                        c = {
                            track: null,
                            iceGatherer: null,
                            iceTransport: null,
                            dtlsTransport: null,
                            localCapabilities: null,
                            remoteCapabilities: null,
                            rtpSender: null,
                            rtpReceiver: null,
                            kind: a,
                            mid: null,
                            sendEncodingParameters: null,
                            recvEncodingParameters: null,
                            stream: null,
                            wantReceive: !0
                        };
                    if (this.usingBundle && b) c.iceTransport = this.transceivers[0].iceTransport, c.dtlsTransport = this.transceivers[0].dtlsTransport;
                    else {
                        var d = this._createIceAndDtlsTransports();
                        c.iceTransport = d.iceTransport, c.dtlsTransport = d.dtlsTransport
                    }
                    return this.transceivers.push(c), c
                }, c.prototype.addTrack = function(b, c) {
                    for (var d, e = 0; e < this.transceivers.length; e++) this.transceivers[e].track || this.transceivers[e].kind !== b.kind || (d = this.transceivers[e]);
                    return d || (d = this._createTransceiver(b.kind)), d.track = b, d.stream = c, d.rtpSender = new a.RTCRtpSender(b, d.dtlsTransport), this._maybeFireNegotiationNeeded(), d.rtpSender
                }, c.prototype.addStream = function(a) {
                    var c = this;
                    if (b >= 15025) this.localStreams.push(a), a.getTracks().forEach(function(b) {
                        c.addTrack(b, a)
                    });
                    else {
                        var d = a.clone();
                        a.getTracks().forEach(function(a, b) {
                            var c = d.getTracks()[b];
                            a.addEventListener("enabled", function(a) {
                                c.enabled = a.enabled
                            })
                        }), d.getTracks().forEach(function(a) {
                            c.addTrack(a, d)
                        }), this.localStreams.push(d)
                    }
                    this._maybeFireNegotiationNeeded()
                }, c.prototype.removeStream = function(a) {
                    var b = this.localStreams.indexOf(a);
                    b > -1 && (this.localStreams.splice(b, 1), this._maybeFireNegotiationNeeded())
                }, c.prototype.getSenders = function() {
                    return this.transceivers.filter(function(a) {
                        return !!a.rtpSender
                    }).map(function(a) {
                        return a.rtpSender
                    })
                }, c.prototype.getReceivers = function() {
                    return this.transceivers.filter(function(a) {
                        return !!a.rtpReceiver
                    }).map(function(a) {
                        return a.rtpReceiver
                    })
                }, c.prototype._createIceGatherer = function(b, c) {
                    var d = this,
                        e = new a.RTCIceGatherer(d.iceOptions);
                    return e.onlocalcandidate = function(a) {
                        var f = new Event("icecandidate");
                        f.candidate = {
                            sdpMid: b,
                            sdpMLineIndex: c
                        };
                        var g = a.candidate,
                            i = !g || 0 === Object.keys(g).length;
                        i ? void 0 === e.state && (e.state = "completed") : (g.component = 1, f.candidate.candidate = h.writeCandidate(g));
                        var j = h.splitSections(d.localDescription.sdp);
                        i ? j[f.candidate.sdpMLineIndex + 1] += "a=end-of-candidates\r\n" : j[f.candidate.sdpMLineIndex + 1] += "a=" + f.candidate.candidate + "\r\n", d.localDescription.sdp = j.join("");
                        var k = d._pendingOffer ? d._pendingOffer : d.transceivers,
                            l = k.every(function(a) {
                                return a.iceGatherer && "completed" === a.iceGatherer.state
                            });
                        switch (d.iceGatheringState) {
                            case "new":
                                i || d._localIceCandidatesBuffer.push(f), i && l && d._localIceCandidatesBuffer.push(new Event("icecandidate"));
                                break;
                            case "gathering":
                                d._emitBufferedCandidates(), i || (d.dispatchEvent(f), null !== d.onicecandidate && d.onicecandidate(f)), l && (d.dispatchEvent(new Event("icecandidate")), null !== d.onicecandidate && d.onicecandidate(new Event("icecandidate")), d.iceGatheringState = "complete", d._emitGatheringStateChange());
                                break;
                            case "complete":
                        }
                    }, e
                }, c.prototype._createIceAndDtlsTransports = function() {
                    var b = this,
                        c = new a.RTCIceTransport(null);
                    c.onicestatechange = function() {
                        b._updateConnectionState()
                    };
                    var d = new a.RTCDtlsTransport(c);
                    return d.ondtlsstatechange = function() {
                        b._updateConnectionState()
                    }, d.onerror = function() {
                        Object.defineProperty(d, "state", {
                            value: "failed",
                            writable: !0
                        }), b._updateConnectionState()
                    }, {
                        iceTransport: c,
                        dtlsTransport: d
                    }
                }, c.prototype._disposeIceAndDtlsTransports = function(a) {
                    var b = this.transceivers[a].iceGatherer;
                    b && (delete b.onlocalcandidate, delete this.transceivers[a].iceGatherer);
                    var c = this.transceivers[a].iceTransport;
                    c && (delete c.onicestatechange, delete this.transceivers[a].iceTransport);
                    var d = this.transceivers[a].dtlsTransport;
                    d && (delete d.ondtlssttatechange, delete d.onerror, delete this.transceivers[a].dtlsTransport)
                }, c.prototype._transceive = function(a, c, d) {
                    var e = f(a.localCapabilities, a.remoteCapabilities);
                    c && a.rtpSender && (e.encodings = a.sendEncodingParameters, e.rtcp = {
                        cname: h.localCName,
                        compound: a.rtcpParameters.compound
                    }, a.recvEncodingParameters.length && (e.rtcp.ssrc = a.recvEncodingParameters[0].ssrc), a.rtpSender.send(e)), d && a.rtpReceiver && ("video" === a.kind && a.recvEncodingParameters && 15019 > b && a.recvEncodingParameters.forEach(function(a) {
                        delete a.rtx
                    }), e.encodings = a.recvEncodingParameters, e.rtcp = {
                        cname: a.rtcpParameters.cname,
                        compound: a.rtcpParameters.compound
                    }, a.sendEncodingParameters.length && (e.rtcp.ssrc = a.sendEncodingParameters[0].ssrc), a.rtpReceiver.receive(e))
                }, c.prototype.setLocalDescription = function(b) {
                    var c = this;
                    if (!g("setLocalDescription", b.type, this.signalingState)) {
                        var d = new Error("Can not set local " + b.type + " in state " + this.signalingState);
                        return d.name = "InvalidStateError", arguments.length > 2 && "function" == typeof arguments[2] && a.setTimeout(arguments[2], 0, d), Promise.reject(d)
                    }
                    var e, i;
                    if ("offer" === b.type) this._pendingOffer && (e = h.splitSections(b.sdp), i = e.shift(), e.forEach(function(a, b) {
                        var d = h.parseRtpParameters(a);
                        c._pendingOffer[b].localCapabilities = d
                    }), this.transceivers = this._pendingOffer, delete this._pendingOffer);
                    else if ("answer" === b.type) {
                        e = h.splitSections(c.remoteDescription.sdp), i = e.shift();
                        var j = h.matchPrefix(i, "a=ice-lite").length > 0;
                        e.forEach(function(a, b) {
                            var d = c.transceivers[b],
                                e = d.iceGatherer,
                                g = d.iceTransport,
                                k = d.dtlsTransport,
                                l = d.localCapabilities,
                                m = d.remoteCapabilities,
                                n = h.isRejected(a);
                            if (!n && !d.isDatachannel) {
                                var o = h.getIceParameters(a, i),
                                    p = h.getDtlsParameters(a, i);
                                j && (p.role = "server"), c.usingBundle && 0 !== b || (g.start(e, o, j ? "controlling" : "controlled"), k.start(p));
                                var q = f(l, m);
                                c._transceive(d, q.codecs.length > 0, !1)
                            }
                        })
                    }
                    switch (this.localDescription = {
                        type: b.type,
                        sdp: b.sdp
                    }, b.type) {
                        case "offer":
                            this._updateSignalingState("have-local-offer");
                            break;
                        case "answer":
                            this._updateSignalingState("stable");
                            break;
                        default:
                            throw new TypeError('unsupported type "' + b.type + '"')
                    }
                    var k = arguments.length > 1 && "function" == typeof arguments[1];
                    if (k) {
                        var l = arguments[1];
                        a.setTimeout(function() {
                            l(), "new" === c.iceGatheringState && (c.iceGatheringState = "gathering", c._emitGatheringStateChange()), c._emitBufferedCandidates()
                        }, 0)
                    }
                    var m = Promise.resolve();
                    return m.then(function() {
                        k || ("new" === c.iceGatheringState && (c.iceGatheringState = "gathering", c._emitGatheringStateChange()), a.setTimeout(c._emitBufferedCandidates.bind(c), 500))
                    }), m
                }, c.prototype.setRemoteDescription = function(c) {
                    var d = this;
                    if (!g("setRemoteDescription", c.type, this.signalingState)) {
                        var e = new Error("Can not set remote " + c.type + " in state " + this.signalingState);
                        return e.name = "InvalidStateError", arguments.length > 2 && "function" == typeof arguments[2] && a.setTimeout(arguments[2], 0, e), Promise.reject(e)
                    }
                    var f = {},
                        i = [],
                        j = h.splitSections(c.sdp),
                        k = j.shift(),
                        l = h.matchPrefix(k, "a=ice-lite").length > 0,
                        m = h.matchPrefix(k, "a=group:BUNDLE ").length > 0;
                    this.usingBundle = m;
                    var n = h.matchPrefix(k, "a=ice-options:")[0];
                    switch (n ? this.canTrickleIceCandidates = n.substr(14).split(" ").indexOf("trickle") >= 0 : this.canTrickleIceCandidates = !1, j.forEach(function(e, g) {
                        var j = h.splitLines(e),
                            n = h.getKind(e),
                            o = h.isRejected(e),
                            p = j[0].substr(2).split(" ")[2],
                            q = h.getDirection(e, k),
                            r = h.parseMsid(e),
                            s = h.getMid(e) || h.generateIdentifier();
                        if ("application" === n && "DTLS/SCTP" === p) return void(d.transceivers[g] = {
                            mid: s,
                            isDatachannel: !0
                        });
                        var t, u, v, w, x, y, z, A, B, C, D, E = h.parseRtpParameters(e);
                        o || (C = h.getIceParameters(e, k), D = h.getDtlsParameters(e, k), D.role = "client"), z = h.parseRtpEncodingParameters(e);
                        var F = h.parseRtcpParameters(e),
                            G = h.matchPrefix(e, "a=end-of-candidates", k).length > 0,
                            H = h.matchPrefix(e, "a=candidate:").map(function(a) {
                                return h.parseCandidate(a)
                            }).filter(function(a) {
                                return "1" === a.component || 1 === a.component
                            });
                        ("offer" === c.type || "answer" === c.type) && !o && m && g > 0 && d.transceivers[g] && (d._disposeIceAndDtlsTransports(g), d.transceivers[g].iceGatherer = d.transceivers[0].iceGatherer, d.transceivers[g].iceTransport = d.transceivers[0].iceTransport, d.transceivers[g].dtlsTransport = d.transceivers[0].dtlsTransport, d.transceivers[g].rtpSender && d.transceivers[g].rtpSender.setTransport(d.transceivers[0].dtlsTransport), d.transceivers[g].rtpReceiver && d.transceivers[g].rtpReceiver.setTransport(d.transceivers[0].dtlsTransport)), "offer" !== c.type || o ? "answer" !== c.type || o || (t = d.transceivers[g], u = t.iceGatherer, v = t.iceTransport,
                            w = t.dtlsTransport, x = t.rtpReceiver, y = t.sendEncodingParameters, A = t.localCapabilities, d.transceivers[g].recvEncodingParameters = z, d.transceivers[g].remoteCapabilities = E, d.transceivers[g].rtcpParameters = F, (l || G) && H.length && v.setRemoteCandidates(H), m && 0 !== g || (v.start(u, C, "controlling"), w.start(D)), d._transceive(t, "sendrecv" === q || "recvonly" === q, "sendrecv" === q || "sendonly" === q), !x || "sendrecv" !== q && "sendonly" !== q ? delete t.rtpReceiver : (B = x.track, r ? (f[r.stream] || (f[r.stream] = new a.MediaStream), f[r.stream].addTrack(B), i.push([B, x, f[r.stream]])) : (f["default"] || (f["default"] = new a.MediaStream), f["default"].addTrack(B), i.push([B, x, f["default"]])))) : (t = d.transceivers[g] || d._createTransceiver(n), t.mid = s, t.iceGatherer || (t.iceGatherer = m && g > 0 ? d.transceivers[0].iceGatherer : d._createIceGatherer(s, g)), !G || m && 0 !== g || t.iceTransport.setRemoteCandidates(H), A = a.RTCRtpReceiver.getCapabilities(n), 15019 > b && (A.codecs = A.codecs.filter(function(a) {
                            return "rtx" !== a.name
                        })), y = [{
                            ssrc: 1001 * (2 * g + 2)
                        }], ("sendrecv" === q || "sendonly" === q) && (x = new a.RTCRtpReceiver(t.dtlsTransport, n), B = x.track, r ? (f[r.stream] || (f[r.stream] = new a.MediaStream, Object.defineProperty(f[r.stream], "id", {
                            get: function() {
                                return r.stream
                            }
                        })), Object.defineProperty(B, "id", {
                            get: function() {
                                return r.track
                            }
                        }), f[r.stream].addTrack(B), i.push([B, x, f[r.stream]])) : (f["default"] || (f["default"] = new a.MediaStream), f["default"].addTrack(B), i.push([B, x, f["default"]]))), t.localCapabilities = A, t.remoteCapabilities = E, t.rtpReceiver = x, t.rtcpParameters = F, t.sendEncodingParameters = y, t.recvEncodingParameters = z, d._transceive(d.transceivers[g], !1, "sendrecv" === q || "sendonly" === q))
                    }), this.remoteDescription = {
                        type: c.type,
                        sdp: c.sdp
                    }, c.type) {
                        case "offer":
                            this._updateSignalingState("have-remote-offer");
                            break;
                        case "answer":
                            this._updateSignalingState("stable");
                            break;
                        default:
                            throw new TypeError('unsupported type "' + c.type + '"')
                    }
                    return Object.keys(f).forEach(function(b) {
                        var c = f[b];
                        if (c.getTracks().length) {
                            d.remoteStreams.push(c);
                            var e = new Event("addstream");
                            e.stream = c, d.dispatchEvent(e), null !== d.onaddstream && a.setTimeout(function() {
                                d.onaddstream(e)
                            }, 0), i.forEach(function(b) {
                                var e = b[0],
                                    f = b[1];
                                if (c.id === b[2].id) {
                                    var g = new Event("track");
                                    g.track = e, g.receiver = f, g.streams = [c], d.dispatchEvent(g), null !== d.ontrack && a.setTimeout(function() {
                                        d.ontrack(g)
                                    }, 0)
                                }
                            })
                        }
                    }), a.setTimeout(function() {
                        d && d.transceivers && d.transceivers.forEach(function(a) {
                            a.iceTransport && "new" === a.iceTransport.state && a.iceTransport.getRemoteCandidates().length > 0 && (console.warn("Timeout for addRemoteCandidate. Consider sending an end-of-candidates notification"), a.iceTransport.addRemoteCandidate({}))
                        })
                    }, 4e3), arguments.length > 1 && "function" == typeof arguments[1] && a.setTimeout(arguments[1], 0), Promise.resolve()
                }, c.prototype.close = function() {
                    this.transceivers.forEach(function(a) {
                        a.iceTransport && a.iceTransport.stop(), a.dtlsTransport && a.dtlsTransport.stop(), a.rtpSender && a.rtpSender.stop(), a.rtpReceiver && a.rtpReceiver.stop()
                    }), this._updateSignalingState("closed")
                }, c.prototype._updateSignalingState = function(a) {
                    this.signalingState = a;
                    var b = new Event("signalingstatechange");
                    this.dispatchEvent(b), null !== this.onsignalingstatechange && this.onsignalingstatechange(b)
                }, c.prototype._maybeFireNegotiationNeeded = function() {
                    var b = this;
                    "stable" === this.signalingState && this.needNegotiation !== !0 && (this.needNegotiation = !0, a.setTimeout(function() {
                        if (b.needNegotiation !== !1) {
                            b.needNegotiation = !1;
                            var a = new Event("negotiationneeded");
                            b.dispatchEvent(a), null !== b.onnegotiationneeded && b.onnegotiationneeded(a)
                        }
                    }, 0))
                }, c.prototype._updateConnectionState = function() {
                    var a, b = this,
                        c = {
                            "new": 0,
                            closed: 0,
                            connecting: 0,
                            checking: 0,
                            connected: 0,
                            completed: 0,
                            disconnected: 0,
                            failed: 0
                        };
                    if (this.transceivers.forEach(function(a) {
                            c[a.iceTransport.state]++, c[a.dtlsTransport.state]++
                        }), c.connected += c.completed, a = "new", c.failed > 0 ? a = "failed" : c.connecting > 0 || c.checking > 0 ? a = "connecting" : c.disconnected > 0 ? a = "disconnected" : c["new"] > 0 ? a = "new" : (c.connected > 0 || c.completed > 0) && (a = "connected"), a !== b.iceConnectionState) {
                        b.iceConnectionState = a;
                        var d = new Event("iceconnectionstatechange");
                        this.dispatchEvent(d), null !== this.oniceconnectionstatechange && this.oniceconnectionstatechange(d)
                    }
                }, c.prototype.createOffer = function() {
                    var c = this;
                    if (this._pendingOffer) throw new Error("createOffer called while there is a pending offer.");
                    var e;
                    1 === arguments.length && "function" != typeof arguments[0] ? e = arguments[0] : 3 === arguments.length && (e = arguments[2]);
                    var f = this.transceivers.filter(function(a) {
                            return "audio" === a.kind
                        }).length,
                        g = this.transceivers.filter(function(a) {
                            return "video" === a.kind
                        }).length;
                    if (e) {
                        if (e.mandatory || e.optional) throw new TypeError("Legacy mandatory/optional constraints not supported.");
                        void 0 !== e.offerToReceiveAudio && (f = e.offerToReceiveAudio === !0 ? 1 : e.offerToReceiveAudio === !1 ? 0 : e.offerToReceiveAudio), void 0 !== e.offerToReceiveVideo && (g = e.offerToReceiveVideo === !0 ? 1 : e.offerToReceiveVideo === !1 ? 0 : e.offerToReceiveVideo)
                    }
                    for (this.transceivers.forEach(function(a) {
                            "audio" === a.kind ? (f--, 0 > f && (a.wantReceive = !1)) : "video" === a.kind && (g--, 0 > g && (a.wantReceive = !1))
                        }); f > 0 || g > 0;) f > 0 && (this._createTransceiver("audio"), f--), g > 0 && (this._createTransceiver("video"), g--);
                    var i = d(this.transceivers),
                        j = h.writeSessionBoilerplate(this._sdpSessionId);
                    i.forEach(function(d, e) {
                        var f = d.track,
                            g = d.kind,
                            j = h.generateIdentifier();
                        d.mid = j, d.iceGatherer || (d.iceGatherer = c.usingBundle && e > 0 ? i[0].iceGatherer : c._createIceGatherer(j, e));
                        var k = a.RTCRtpSender.getCapabilities(g);
                        15019 > b && (k.codecs = k.codecs.filter(function(a) {
                            return "rtx" !== a.name
                        })), k.codecs.forEach(function(a) {
                            "H264" === a.name && void 0 === a.parameters["level-asymmetry-allowed"] && (a.parameters["level-asymmetry-allowed"] = "1")
                        });
                        var l = [{
                            ssrc: 1001 * (2 * e + 1)
                        }];
                        f && b >= 15019 && "video" === g && (l[0].rtx = {
                            ssrc: 1001 * (2 * e + 1) + 1
                        }), d.wantReceive && (d.rtpReceiver = new a.RTCRtpReceiver(d.dtlsTransport, g)), d.localCapabilities = k, d.sendEncodingParameters = l
                    }), "max-compat" !== this._config.bundlePolicy && (j += "a=group:BUNDLE " + i.map(function(a) {
                        return a.mid
                    }).join(" ") + "\r\n"), j += "a=ice-options:trickle\r\n", i.forEach(function(a, b) {
                        j += h.writeMediaSection(a, a.localCapabilities, "offer", a.stream), j += "a=rtcp-rsize\r\n"
                    }), this._pendingOffer = i;
                    var k = new a.RTCSessionDescription({
                        type: "offer",
                        sdp: j
                    });
                    return arguments.length && "function" == typeof arguments[0] && a.setTimeout(arguments[0], 0, k), Promise.resolve(k)
                }, c.prototype.createAnswer = function() {
                    var c = h.writeSessionBoilerplate(this._sdpSessionId);
                    this.usingBundle && (c += "a=group:BUNDLE " + this.transceivers.map(function(a) {
                        return a.mid
                    }).join(" ") + "\r\n"), this.transceivers.forEach(function(a, d) {
                        if (a.isDatachannel) return void(c += "m=application 0 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=mid:" + a.mid + "\r\n");
                        if (a.stream) {
                            var e;
                            "audio" === a.kind ? e = a.stream.getAudioTracks()[0] : "video" === a.kind && (e = a.stream.getVideoTracks()[0]), e && b >= 15019 && "video" === a.kind && (a.sendEncodingParameters[0].rtx = {
                                ssrc: 1001 * (2 * d + 2) + 1
                            })
                        }
                        var g = f(a.localCapabilities, a.remoteCapabilities),
                            i = g.codecs.filter(function(a) {
                                return "rtx" === a.name.toLowerCase()
                            }).length;
                        !i && a.sendEncodingParameters[0].rtx && delete a.sendEncodingParameters[0].rtx, c += h.writeMediaSection(a, g, "answer", a.stream), a.rtcpParameters && a.rtcpParameters.reducedSize && (c += "a=rtcp-rsize\r\n")
                    });
                    var d = new a.RTCSessionDescription({
                        type: "answer",
                        sdp: c
                    });
                    return arguments.length && "function" == typeof arguments[0] && a.setTimeout(arguments[0], 0, d), Promise.resolve(d)
                }, c.prototype.addIceCandidate = function(b) {
                    if (b) {
                        var c = b.sdpMLineIndex;
                        if (b.sdpMid)
                            for (var d = 0; d < this.transceivers.length; d++)
                                if (this.transceivers[d].mid === b.sdpMid) {
                                    c = d;
                                    break
                                }
                        var e = this.transceivers[c];
                        if (e) {
                            var f = Object.keys(b.candidate).length > 0 ? h.parseCandidate(b.candidate) : {};
                            if ("tcp" === f.protocol && (0 === f.port || 9 === f.port)) return Promise.resolve();
                            if (f.component && "1" !== f.component && 1 !== f.component) return Promise.resolve();
                            e.iceTransport.addRemoteCandidate(f);
                            var g = h.splitSections(this.remoteDescription.sdp);
                            g[c + 1] += (f.type ? b.candidate.trim() : "a=end-of-candidates") + "\r\n", this.remoteDescription.sdp = g.join("")
                        }
                    } else
                        for (var i = 0; i < this.transceivers.length; i++)
                            if (this.transceivers[i].iceTransport.addRemoteCandidate({}), this.usingBundle) return Promise.resolve();
                    return arguments.length > 1 && "function" == typeof arguments[1] && a.setTimeout(arguments[1], 0), Promise.resolve()
                }, c.prototype.getStats = function() {
                    var b = [];
                    this.transceivers.forEach(function(a) {
                        ["rtpSender", "rtpReceiver", "iceGatherer", "iceTransport", "dtlsTransport"].forEach(function(c) {
                            a[c] && b.push(a[c].getStats())
                        })
                    });
                    var c = arguments.length > 1 && "function" == typeof arguments[1] && arguments[1],
                        d = function(a) {
                            return {
                                inboundrtp: "inbound-rtp",
                                outboundrtp: "outbound-rtp",
                                candidatepair: "candidate-pair",
                                localcandidate: "local-candidate",
                                remotecandidate: "remote-candidate"
                            }[a.type] || a.type
                        };
                    return new Promise(function(e) {
                        var f = new Map;
                        Promise.all(b).then(function(b) {
                            b.forEach(function(a) {
                                Object.keys(a).forEach(function(b) {
                                    a[b].type = d(a[b]), f.set(b, a[b])
                                })
                            }), c && a.setTimeout(c, 0, f), e(f)
                        })
                    })
                }, c
            }
        }, {
            sdp: 1
        }],
        9: [function(a, b, c) {
            "use strict";
            var d = a("../utils"),
                e = {
                    shimOnTrack: function(a) {
                        "object" != typeof a || !a.RTCPeerConnection || "ontrack" in a.RTCPeerConnection.prototype || Object.defineProperty(a.RTCPeerConnection.prototype, "ontrack", {
                            get: function() {
                                return this._ontrack
                            },
                            set: function(a) {
                                this._ontrack && (this.removeEventListener("track", this._ontrack), this.removeEventListener("addstream", this._ontrackpoly)), this.addEventListener("track", this._ontrack = a), this.addEventListener("addstream", this._ontrackpoly = function(a) {
                                    a.stream.getTracks().forEach(function(b) {
                                        var c = new Event("track");
                                        c.track = b, c.receiver = {
                                            track: b
                                        }, c.streams = [a.stream], this.dispatchEvent(c)
                                    }.bind(this))
                                }.bind(this))
                            }
                        })
                    },
                    shimSourceObject: function(a) {
                        "object" == typeof a && (!a.HTMLMediaElement || "srcObject" in a.HTMLMediaElement.prototype || Object.defineProperty(a.HTMLMediaElement.prototype, "srcObject", {
                            get: function() {
                                return this.mozSrcObject
                            },
                            set: function(a) {
                                this.mozSrcObject = a
                            }
                        }))
                    },
                    shimPeerConnection: function(a) {
                        var b = d.detectBrowser(a);
                        if ("object" == typeof a && (a.RTCPeerConnection || a.mozRTCPeerConnection)) {
                            a.RTCPeerConnection || (a.RTCPeerConnection = function(c, d) {
                                if (b.version < 38 && c && c.iceServers) {
                                    for (var e = [], f = 0; f < c.iceServers.length; f++) {
                                        var g = c.iceServers[f];
                                        if (g.hasOwnProperty("urls"))
                                            for (var h = 0; h < g.urls.length; h++) {
                                                var i = {
                                                    url: g.urls[h]
                                                };
                                                0 === g.urls[h].indexOf("turn") && (i.username = g.username, i.credential = g.credential), e.push(i)
                                            } else e.push(c.iceServers[f])
                                    }
                                    c.iceServers = e
                                }
                                return new a.mozRTCPeerConnection(c, d)
                            }, a.RTCPeerConnection.prototype = a.mozRTCPeerConnection.prototype, a.mozRTCPeerConnection.generateCertificate && Object.defineProperty(a.RTCPeerConnection, "generateCertificate", {
                                get: function() {
                                    return a.mozRTCPeerConnection.generateCertificate
                                }
                            }), a.RTCSessionDescription = a.mozRTCSessionDescription, a.RTCIceCandidate = a.mozRTCIceCandidate), ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(b) {
                                var c = a.RTCPeerConnection.prototype[b];
                                a.RTCPeerConnection.prototype[b] = function() {
                                    return arguments[0] = new("addIceCandidate" === b ? a.RTCIceCandidate : a.RTCSessionDescription)(arguments[0]), c.apply(this, arguments)
                                }
                            });
                            var c = a.RTCPeerConnection.prototype.addIceCandidate;
                            a.RTCPeerConnection.prototype.addIceCandidate = function() {
                                return arguments[0] ? c.apply(this, arguments) : (arguments[1] && arguments[1].apply(null), Promise.resolve())
                            };
                            var e = function(a) {
                                    var b = new Map;
                                    return Object.keys(a).forEach(function(c) {
                                        b.set(c, a[c]), b[c] = a[c]
                                    }), b
                                },
                                f = {
                                    inboundrtp: "inbound-rtp",
                                    outboundrtp: "outbound-rtp",
                                    candidatepair: "candidate-pair",
                                    localcandidate: "local-candidate",
                                    remotecandidate: "remote-candidate"
                                },
                                g = a.RTCPeerConnection.prototype.getStats;
                            a.RTCPeerConnection.prototype.getStats = function(a, c, d) {
                                return g.apply(this, [a || null]).then(function(a) {
                                    if (b.version < 48 && (a = e(a)), b.version < 53 && !c) try {
                                        a.forEach(function(a) {
                                            a.type = f[a.type] || a.type
                                        })
                                    } catch (d) {
                                        if ("TypeError" !== d.name) throw d;
                                        a.forEach(function(b, c) {
                                            a.set(c, Object.assign({}, b, {
                                                type: f[b.type] || b.type
                                            }))
                                        })
                                    }
                                    return a
                                }).then(c, d)
                            }
                        }
                    }
                };
            b.exports = {
                shimOnTrack: e.shimOnTrack,
                shimSourceObject: e.shimSourceObject,
                shimPeerConnection: e.shimPeerConnection,
                shimGetUserMedia: a("./getusermedia")
            }
        }, {
            "../utils": 12,
            "./getusermedia": 10
        }],
        10: [function(a, b, c) {
            "use strict";
            var d = a("../utils"),
                e = d.log;
            b.exports = function(a) {
                var b = d.detectBrowser(a),
                    c = a && a.navigator,
                    f = a && a.MediaStreamTrack,
                    g = function(a) {
                        return {
                            name: {
                                InternalError: "NotReadableError",
                                NotSupportedError: "TypeError",
                                PermissionDeniedError: "NotAllowedError",
                                SecurityError: "NotAllowedError"
                            }[a.name] || a.name,
                            message: {
                                "The operation is insecure.": "The request is not allowed by the user agent or the platform in the current context."
                            }[a.message] || a.message,
                            constraint: a.constraint,
                            toString: function() {
                                return this.name + (this.message && ": ") + this.message
                            }
                        }
                    },
                    h = function(a, d, f) {
                        var h = function(a) {
                            if ("object" != typeof a || a.require) return a;
                            var b = [];
                            return Object.keys(a).forEach(function(c) {
                                if ("require" !== c && "advanced" !== c && "mediaSource" !== c) {
                                    var d = a[c] = "object" == typeof a[c] ? a[c] : {
                                        ideal: a[c]
                                    };
                                    if ((void 0 !== d.min || void 0 !== d.max || void 0 !== d.exact) && b.push(c), void 0 !== d.exact && ("number" == typeof d.exact ? d.min = d.max = d.exact : a[c] = d.exact, delete d.exact), void 0 !== d.ideal) {
                                        a.advanced = a.advanced || [];
                                        var e = {};
                                        "number" == typeof d.ideal ? e[c] = {
                                            min: d.ideal,
                                            max: d.ideal
                                        } : e[c] = d.ideal, a.advanced.push(e), delete d.ideal, Object.keys(d).length || delete a[c]
                                    }
                                }
                            }), b.length && (a.require = b), a
                        };
                        return a = JSON.parse(JSON.stringify(a)), b.version < 38 && (e("spec: " + JSON.stringify(a)), a.audio && (a.audio = h(a.audio)), a.video && (a.video = h(a.video)), e("ff37: " + JSON.stringify(a))), c.mozGetUserMedia(a, d, function(a) {
                            f(g(a))
                        })
                    },
                    i = function(a) {
                        return new Promise(function(b, c) {
                            h(a, b, c)
                        })
                    };
                if (c.mediaDevices || (c.mediaDevices = {
                        getUserMedia: i,
                        addEventListener: function() {},
                        removeEventListener: function() {}
                    }), c.mediaDevices.enumerateDevices = c.mediaDevices.enumerateDevices || function() {
                        return new Promise(function(a) {
                            var b = [{
                                kind: "audioinput",
                                deviceId: "default",
                                label: "",
                                groupId: ""
                            }, {
                                kind: "videoinput",
                                deviceId: "default",
                                label: "",
                                groupId: ""
                            }];
                            a(b)
                        })
                    }, b.version < 41) {
                    var j = c.mediaDevices.enumerateDevices.bind(c.mediaDevices);
                    c.mediaDevices.enumerateDevices = function() {
                        return j().then(void 0, function(a) {
                            if ("NotFoundError" === a.name) return [];
                            throw a
                        })
                    }
                }
                if (b.version < 49) {
                    var k = c.mediaDevices.getUserMedia.bind(c.mediaDevices);
                    c.mediaDevices.getUserMedia = function(a) {
                        return k(a).then(function(b) {
                            if (a.audio && !b.getAudioTracks().length || a.video && !b.getVideoTracks().length) throw b.getTracks().forEach(function(a) {
                                a.stop()
                            }), new DOMException("The object can not be found here.", "NotFoundError");
                            return b
                        }, function(a) {
                            return Promise.reject(g(a))
                        })
                    }
                }
                if (!(b.version > 55 && "autoGainControl" in c.mediaDevices.getSupportedConstraints())) {
                    var l = function(a, b, c) {
                            b in a && !(c in a) && (a[c] = a[b], delete a[b])
                        },
                        m = c.mediaDevices.getUserMedia.bind(c.mediaDevices);
                    if (c.mediaDevices.getUserMedia = function(a) {
                            return "object" == typeof a && "object" == typeof a.audio && (a = JSON.parse(JSON.stringify(a)), l(a.audio, "autoGainControl", "mozAutoGainControl"), l(a.audio, "noiseSuppression", "mozNoiseSuppression")), m(a)
                        }, f && f.prototype.getSettings) {
                        var n = f.prototype.getSettings;
                        f.prototype.getSettings = function() {
                            var a = n.apply(this, arguments);
                            return l(a, "mozAutoGainControl", "autoGainControl"), l(a, "mozNoiseSuppression", "noiseSuppression"), a
                        }
                    }
                    if (f && f.prototype.applyConstraints) {
                        var o = f.prototype.applyConstraints;
                        f.prototype.applyConstraints = function(a) {
                            return "audio" === this.kind && "object" == typeof a && (a = JSON.parse(JSON.stringify(a)), l(a, "autoGainControl", "mozAutoGainControl"), l(a, "noiseSuppression", "mozNoiseSuppression")), o.apply(this, [a])
                        }
                    }
                }
                c.getUserMedia = function(a, d, e) {
                    return b.version < 44 ? h(a, d, e) : (console.warn("navigator.getUserMedia has been replaced by navigator.mediaDevices.getUserMedia"), void c.mediaDevices.getUserMedia(a).then(d, e))
                }
            }
        }, {
            "../utils": 12
        }],
        11: [function(a, b, c) {
            "use strict";
            var d = a("../utils"),
                e = {
                    shimLocalStreamsAPI: function(a) {
                        if ("object" == typeof a && a.RTCPeerConnection) {
                            if ("getLocalStreams" in a.RTCPeerConnection.prototype || (a.RTCPeerConnection.prototype.getLocalStreams = function() {
                                    return this._localStreams || (this._localStreams = []), this._localStreams
                                }), "getStreamById" in a.RTCPeerConnection.prototype || (a.RTCPeerConnection.prototype.getStreamById = function(a) {
                                    var b = null;
                                    return this._localStreams && this._localStreams.forEach(function(c) {
                                        c.id === a && (b = c)
                                    }), this._remoteStreams && this._remoteStreams.forEach(function(c) {
                                        c.id === a && (b = c)
                                    }), b
                                }), !("addStream" in a.RTCPeerConnection.prototype)) {
                                var b = a.RTCPeerConnection.prototype.addTrack;
                                a.RTCPeerConnection.prototype.addStream = function(a) {
                                    this._localStreams || (this._localStreams = []), -1 === this._localStreams.indexOf(a) && this._localStreams.push(a);
                                    var c = this;
                                    a.getTracks().forEach(function(d) {
                                        b.call(c, d, a)
                                    })
                                }, a.RTCPeerConnection.prototype.addTrack = function(a, c) {
                                    c && (this._localStreams ? -1 === this._localStreams.indexOf(c) && this._localStreams.push(c) : this._localStreams = [c]), b.call(this, a, c)
                                }
                            }
                            "removeStream" in a.RTCPeerConnection.prototype || (a.RTCPeerConnection.prototype.removeStream = function(a) {
                                this._localStreams || (this._localStreams = []);
                                var b = this._localStreams.indexOf(a);
                                if (-1 !== b) {
                                    this._localStreams.splice(b, 1);
                                    var c = this,
                                        d = a.getTracks();
                                    this.getSenders().forEach(function(a) {
                                        -1 !== d.indexOf(a.track) && c.removeTrack(a)
                                    })
                                }
                            })
                        }
                    },
                    shimRemoteStreamsAPI: function(a) {
                        "object" == typeof a && a.RTCPeerConnection && ("getRemoteStreams" in a.RTCPeerConnection.prototype || (a.RTCPeerConnection.prototype.getRemoteStreams = function() {
                            return this._remoteStreams ? this._remoteStreams : []
                        }), "onaddstream" in a.RTCPeerConnection.prototype || Object.defineProperty(a.RTCPeerConnection.prototype, "onaddstream", {
                            get: function() {
                                return this._onaddstream
                            },
                            set: function(a) {
                                this._onaddstream && (this.removeEventListener("addstream", this._onaddstream), this.removeEventListener("track", this._onaddstreampoly)), this.addEventListener("addstream", this._onaddstream = a), this.addEventListener("track", this._onaddstreampoly = function(a) {
                                    var b = a.streams[0];
                                    if (this._remoteStreams || (this._remoteStreams = []), !(this._remoteStreams.indexOf(b) >= 0)) {
                                        this._remoteStreams.push(b);
                                        var c = new Event("addstream");
                                        c.stream = a.streams[0], this.dispatchEvent(c)
                                    }
                                }.bind(this))
                            }
                        }))
                    },
                    shimCallbacksAPI: function(a) {
                        if ("object" == typeof a && a.RTCPeerConnection) {
                            var b = a.RTCPeerConnection.prototype,
                                c = b.createOffer,
                                d = b.createAnswer,
                                e = b.setLocalDescription,
                                f = b.setRemoteDescription,
                                g = b.addIceCandidate;
                            b.createOffer = function(a, b) {
                                var d = arguments.length >= 2 ? arguments[2] : arguments[0],
                                    e = c.apply(this, [d]);
                                return b ? (e.then(a, b), Promise.resolve()) : e
                            }, b.createAnswer = function(a, b) {
                                var c = arguments.length >= 2 ? arguments[2] : arguments[0],
                                    e = d.apply(this, [c]);
                                return b ? (e.then(a, b), Promise.resolve()) : e
                            };
                            var h = function(a, b, c) {
                                var d = e.apply(this, [a]);
                                return c ? (d.then(b, c), Promise.resolve()) : d
                            };
                            b.setLocalDescription = h, h = function(a, b, c) {
                                var d = f.apply(this, [a]);
                                return c ? (d.then(b, c), Promise.resolve()) : d
                            }, b.setRemoteDescription = h, h = function(a, b, c) {
                                var d = g.apply(this, [a]);
                                return c ? (d.then(b, c), Promise.resolve()) : d
                            }, b.addIceCandidate = h
                        }
                    },
                    shimGetUserMedia: function(a) {
                        var b = a && a.navigator;
                        b.getUserMedia || (b.webkitGetUserMedia ? b.getUserMedia = b.webkitGetUserMedia.bind(b) : b.mediaDevices && b.mediaDevices.getUserMedia && (b.getUserMedia = function(a, c, d) {
                            b.mediaDevices.getUserMedia(a).then(c, d)
                        }.bind(b)))
                    },
                    shimRTCIceServerUrls: function(a) {
                        var b = a.RTCPeerConnection;
                        a.RTCPeerConnection = function(a, c) {
                            if (a && a.iceServers) {
                                for (var e = [], f = 0; f < a.iceServers.length; f++) {
                                    var g = a.iceServers[f];
                                    !g.hasOwnProperty("urls") && g.hasOwnProperty("url") ? (d.deprecated("RTCIceServer.url", "RTCIceServer.urls"), g = JSON.parse(JSON.stringify(g)), g.urls = g.url, delete g.url, e.push(g)) : e.push(a.iceServers[f])
                                }
                                a.iceServers = e
                            }
                            return new b(a, c)
                        }, a.RTCPeerConnection.prototype = b.prototype, Object.defineProperty(a.RTCPeerConnection, "generateCertificate", {
                            get: function() {
                                return b.generateCertificate
                            }
                        })
                    }
                };
            b.exports = {
                shimCallbacksAPI: e.shimCallbacksAPI,
                shimLocalStreamsAPI: e.shimLocalStreamsAPI,
                shimRemoteStreamsAPI: e.shimRemoteStreamsAPI,
                shimGetUserMedia: e.shimGetUserMedia,
                shimRTCIceServerUrls: e.shimRTCIceServerUrls
            }
        }, {
            "../utils": 12
        }],
        12: [function(a, b, c) {
            "use strict";
            var d = !0,
                e = !0,
                f = {
                    disableLog: function(a) {
                        return "boolean" != typeof a ? new Error("Argument type: " + typeof a + ". Please use a boolean.") : (d = a, a ? "adapter.js logging disabled" : "adapter.js logging enabled")
                    },
                    disableWarnings: function(a) {
                        return "boolean" != typeof a ? new Error("Argument type: " + typeof a + ". Please use a boolean.") : (e = !a, "adapter.js deprecation warnings " + (a ? "disabled" : "enabled"))
                    },
                    log: function() {
                        if ("object" == typeof window) {
                            if (d) return;
                            "undefined" != typeof console && "function" == typeof console.log && console.log.apply(console, arguments)
                        }
                    },
                    deprecated: function(a, b) {
                        e && console.warn(a + " is deprecated, please use " + b + " instead.")
                    },
                    extractVersion: function(a, b, c) {
                        var d = a.match(b);
                        return d && d.length >= c && parseInt(d[c], 10)
                    },
                    detectBrowser: function(a) {
                        var b = a && a.navigator,
                            c = {};
                        if (c.browser = null, c.version = null, "undefined" == typeof a || !a.navigator) return c.browser = "Not a browser.", c;
                        if (b.mozGetUserMedia) c.browser = "firefox", c.version = this.extractVersion(b.userAgent, /Firefox\/(\d+)\./, 1);
                        else if (b.webkitGetUserMedia)
                            if (a.webkitRTCPeerConnection) c.browser = "chrome", c.version = this.extractVersion(b.userAgent, /Chrom(e|ium)\/(\d+)\./, 2);
                            else {
                                if (!b.userAgent.match(/Version\/(\d+).(\d+)/)) return c.browser = "Unsupported webkit-based browser with GUM support but no WebRTC support.", c;
                                c.browser = "safari", c.version = this.extractVersion(b.userAgent, /AppleWebKit\/(\d+)\./, 1)
                            }
                        else if (b.mediaDevices && b.userAgent.match(/Edge\/(\d+).(\d+)$/)) c.browser = "edge", c.version = this.extractVersion(b.userAgent, /Edge\/(\d+).(\d+)$/, 2);
                        else {
                            if (!b.mediaDevices || !b.userAgent.match(/AppleWebKit\/(\d+)\./)) return c.browser = "Not a supported browser.", c;
                            c.browser = "safari", c.version = this.extractVersion(b.userAgent, /AppleWebKit\/(\d+)\./, 1)
                        }
                        return c
                    },
                    shimCreateObjectURL: function(a) {
                        var b = a && a.URL;
                        if (!("object" == typeof a && a.HTMLMediaElement && "srcObject" in a.HTMLMediaElement.prototype)) return void 0;
                        var c = b.createObjectURL.bind(b),
                            d = b.revokeObjectURL.bind(b),
                            e = new Map,
                            g = 0;
                        b.createObjectURL = function(a) {
                            if ("getTracks" in a) {
                                var b = "polyblob:" + ++g;
                                return e.set(b, a), f.deprecated("URL.createObjectURL(stream)", "elem.srcObject = stream"), b
                            }
                            return c(a)
                        }, b.revokeObjectURL = function(a) {
                            d(a), e["delete"](a)
                        };
                        var h = Object.getOwnPropertyDescriptor(a.HTMLMediaElement.prototype, "src");
                        Object.defineProperty(a.HTMLMediaElement.prototype, "src", {
                            get: function() {
                                return h.get.apply(this)
                            },
                            set: function(a) {
                                return this.srcObject = e.get(a) || null, h.set.apply(this, [a])
                            }
                        });
                        var i = a.HTMLMediaElement.prototype.setAttribute;
                        a.HTMLMediaElement.prototype.setAttribute = function() {
                            return 2 === arguments.length && "src" === ("" + arguments[0]).toLowerCase() && (this.srcObject = e.get(arguments[1]) || null), i.apply(this, arguments)
                        }
                    }
                };
            b.exports = {
                log: f.log,
                deprecated: f.deprecated,
                disableLog: f.disableLog,
                disableWarnings: f.disableWarnings,
                extractVersion: f.extractVersion,
                shimCreateObjectURL: f.shimCreateObjectURL,
                detectBrowser: f.detectBrowser.bind(f)
            }
        }, {}]
    }, {}, [2])(2)
}),
function() {
    function a(a, b) {
        var c = {
            audio: !1,
            video: {
                mandatory: {
                    chromeMediaSource: a ? "screen" : "desktop",
                    maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                    maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
                },
                optional: []
            }
        };
        return b && (c.video.mandatory.chromeMediaSourceId = b), c
    }

    function b() {
        return d ? d.isLoaded ? void d.contentWindow.postMessage({
            captureSourceId: !0
        }, "*") : void setTimeout(b, 100) : void c(b)
    }

    function c(a) {
        return d ? void a() : (d = document.createElement("iframe"), d.onload = function() {
            d.isLoaded = !0, a()
        }, d.src = "https://www.webrtc-experiment.com/getSourceId/", d.style.display = "none", void(document.body || document.documentElement).appendChild(d))
    }
    window.getScreenId = function(c) {
        function d(b) {
            b.data && (b.data.chromeMediaSourceId && ("PermissionDeniedError" === b.data.chromeMediaSourceId ? c("permission-denied") : c(null, b.data.chromeMediaSourceId, a(null, b.data.chromeMediaSourceId))), b.data.chromeExtensionStatus && c(b.data.chromeExtensionStatus, null, a(b.data.chromeExtensionStatus)), window.removeEventListener("message", d))
        }
        return navigator.mozGetUserMedia ? void c(null, "firefox", {
            video: {
                mozMediaSource: "window",
                mediaSource: "window"
            }
        }) : (b(), void window.addEventListener("message", d))
    };
    var d;
    window.getScreenConstraints = function(a) {
        c(function() {
            getScreenId(function(b, c, d) {
                a(b, d.video)
            })
        })
    }
}(),
function() {
    function a(a, b) {
        var c = {
            audio: !1,
            video: {
                mandatory: {
                    chromeMediaSource: a ? "screen" : "desktop",
                    maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                    maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
                },
                optional: []
            }
        };
        return b && (c.video.mandatory.chromeMediaSourceId = b), c
    }

    function b() {
        return d ? d.isLoaded ? void d.contentWindow.postMessage({
            captureSourceId: !0
        }, "*") : void setTimeout(b, 100) : void c(b)
    }

    function c(a) {
        return d ? void a() : (d = document.createElement("iframe"), d.onload = function() {
            d.isLoaded = !0, a()
        }, d.src = "https://www.webrtc-experiment.com/getSourceId/", d.style.display = "none", void(document.body || document.documentElement).appendChild(d))
    }
    if (-1 !== document.domain.indexOf("webrtc-experiment.com")) {
        window.getScreenId = function(c) {
            function d(b) {
                b.data && (b.data.chromeMediaSourceId && ("PermissionDeniedError" === b.data.chromeMediaSourceId ? c("permission-denied") : c(null, b.data.chromeMediaSourceId, a(null, b.data.chromeMediaSourceId))), b.data.chromeExtensionStatus && c(b.data.chromeExtensionStatus, null, a(b.data.chromeExtensionStatus)), window.removeEventListener("message", d))
            }
            return navigator.mozGetUserMedia ? void c(null, "firefox", {
                video: {
                    mozMediaSource: "window",
                    mediaSource: "window"
                }
            }) : (b(), void window.addEventListener("message", d))
        };
        var d;
        window.getScreenConstraints = function(a) {
            c(function() {
                getScreenId(function(b, c, d) {
                    a(b, d.video)
                })
            })
        }
    }
}(), ! function(a) {
    "use strict";

    function b(a, b) {
        var c = (65535 & a) + (65535 & b),
            d = (a >> 16) + (b >> 16) + (c >> 16);
        return d << 16 | 65535 & c
    }

    function c(a, b) {
        return a << b | a >>> 32 - b
    }

    function d(a, d, e, f, g, h) {
        return b(c(b(b(d, a), b(f, h)), g), e)
    }

    function e(a, b, c, e, f, g, h) {
        return d(b & c | ~b & e, a, b, f, g, h)
    }

    function f(a, b, c, e, f, g, h) {
        return d(b & e | c & ~e, a, b, f, g, h)
    }

    function g(a, b, c, e, f, g, h) {
        return d(b ^ c ^ e, a, b, f, g, h)
    }

    function h(a, b, c, e, f, g, h) {
        return d(c ^ (b | ~e), a, b, f, g, h)
    }

    function i(a, c) {
        a[c >> 5] |= 128 << c % 32, a[(c + 64 >>> 9 << 4) + 14] = c;
        var d, i, j, k, l, m = 1732584193,
            n = -271733879,
            o = -1732584194,
            p = 271733878;
        for (d = 0; d < a.length; d += 16) i = m, j = n, k = o, l = p, m = e(m, n, o, p, a[d], 7, -680876936), p = e(p, m, n, o, a[d + 1], 12, -389564586), o = e(o, p, m, n, a[d + 2], 17, 606105819), n = e(n, o, p, m, a[d + 3], 22, -1044525330), m = e(m, n, o, p, a[d + 4], 7, -176418897), p = e(p, m, n, o, a[d + 5], 12, 1200080426), o = e(o, p, m, n, a[d + 6], 17, -1473231341), n = e(n, o, p, m, a[d + 7], 22, -45705983), m = e(m, n, o, p, a[d + 8], 7, 1770035416), p = e(p, m, n, o, a[d + 9], 12, -1958414417), o = e(o, p, m, n, a[d + 10], 17, -42063), n = e(n, o, p, m, a[d + 11], 22, -1990404162), m = e(m, n, o, p, a[d + 12], 7, 1804603682), p = e(p, m, n, o, a[d + 13], 12, -40341101), o = e(o, p, m, n, a[d + 14], 17, -1502002290), n = e(n, o, p, m, a[d + 15], 22, 1236535329), m = f(m, n, o, p, a[d + 1], 5, -165796510), p = f(p, m, n, o, a[d + 6], 9, -1069501632), o = f(o, p, m, n, a[d + 11], 14, 643717713), n = f(n, o, p, m, a[d], 20, -373897302), m = f(m, n, o, p, a[d + 5], 5, -701558691), p = f(p, m, n, o, a[d + 10], 9, 38016083), o = f(o, p, m, n, a[d + 15], 14, -660478335), n = f(n, o, p, m, a[d + 4], 20, -405537848), m = f(m, n, o, p, a[d + 9], 5, 568446438), p = f(p, m, n, o, a[d + 14], 9, -1019803690), o = f(o, p, m, n, a[d + 3], 14, -187363961), n = f(n, o, p, m, a[d + 8], 20, 1163531501), m = f(m, n, o, p, a[d + 13], 5, -1444681467), p = f(p, m, n, o, a[d + 2], 9, -51403784), o = f(o, p, m, n, a[d + 7], 14, 1735328473), n = f(n, o, p, m, a[d + 12], 20, -1926607734), m = g(m, n, o, p, a[d + 5], 4, -378558), p = g(p, m, n, o, a[d + 8], 11, -2022574463), o = g(o, p, m, n, a[d + 11], 16, 1839030562), n = g(n, o, p, m, a[d + 14], 23, -35309556), m = g(m, n, o, p, a[d + 1], 4, -1530992060), p = g(p, m, n, o, a[d + 4], 11, 1272893353), o = g(o, p, m, n, a[d + 7], 16, -155497632), n = g(n, o, p, m, a[d + 10], 23, -1094730640), m = g(m, n, o, p, a[d + 13], 4, 681279174), p = g(p, m, n, o, a[d], 11, -358537222), o = g(o, p, m, n, a[d + 3], 16, -722521979), n = g(n, o, p, m, a[d + 6], 23, 76029189), m = g(m, n, o, p, a[d + 9], 4, -640364487), p = g(p, m, n, o, a[d + 12], 11, -421815835), o = g(o, p, m, n, a[d + 15], 16, 530742520), n = g(n, o, p, m, a[d + 2], 23, -995338651), m = h(m, n, o, p, a[d], 6, -198630844), p = h(p, m, n, o, a[d + 7], 10, 1126891415), o = h(o, p, m, n, a[d + 14], 15, -1416354905), n = h(n, o, p, m, a[d + 5], 21, -57434055), m = h(m, n, o, p, a[d + 12], 6, 1700485571), p = h(p, m, n, o, a[d + 3], 10, -1894986606), o = h(o, p, m, n, a[d + 10], 15, -1051523), n = h(n, o, p, m, a[d + 1], 21, -2054922799), m = h(m, n, o, p, a[d + 8], 6, 1873313359), p = h(p, m, n, o, a[d + 15], 10, -30611744), o = h(o, p, m, n, a[d + 6], 15, -1560198380), n = h(n, o, p, m, a[d + 13], 21, 1309151649), m = h(m, n, o, p, a[d + 4], 6, -145523070), p = h(p, m, n, o, a[d + 11], 10, -1120210379), o = h(o, p, m, n, a[d + 2], 15, 718787259), n = h(n, o, p, m, a[d + 9], 21, -343485551), m = b(m, i), n = b(n, j), o = b(o, k), p = b(p, l);
        return [m, n, o, p]
    }

    function j(a) {
        var b, c = "";
        for (b = 0; b < 32 * a.length; b += 8) c += String.fromCharCode(a[b >> 5] >>> b % 32 & 255);
        return c
    }

    function k(a) {
        var b, c = [];
        for (c[(a.length >> 2) - 1] = void 0, b = 0; b < c.length; b += 1) c[b] = 0;
        for (b = 0; b < 8 * a.length; b += 8) c[b >> 5] |= (255 & a.charCodeAt(b / 8)) << b % 32;
        return c
    }

    function l(a) {
        return j(i(k(a), 8 * a.length))
    }

    function m(a, b) {
        var c, d, e = k(a),
            f = [],
            g = [];
        for (f[15] = g[15] = void 0, e.length > 16 && (e = i(e, 8 * a.length)), c = 0; 16 > c; c += 1) f[c] = 909522486 ^ e[c], g[c] = 1549556828 ^ e[c];
        return d = i(f.concat(k(b)), 512 + 8 * b.length), j(i(g.concat(d), 640))
    }

    function n(a) {
        var b, c, d = "0123456789abcdef",
            e = "";
        for (c = 0; c < a.length; c += 1) b = a.charCodeAt(c), e += d.charAt(b >>> 4 & 15) + d.charAt(15 & b);
        return e
    }

    function o(a) {
        return unescape(encodeURIComponent(a))
    }

    function p(a) {
        return l(o(a))
    }

    function q(a) {
        return n(p(a))
    }

    function r(a, b) {
        return m(o(a), o(b))
    }

    function s(a, b) {
        return n(r(a, b))
    }

    function t(a, b, c) {
        return b ? c ? r(b, a) : s(b, a) : c ? p(a) : q(a)
    }
    "function" == typeof define && define.amd ? define(function() {
        return t
    }) : a.md5 = t
}(this),
function() {
    "use strict";
    var a = angular.module("vertoApp", ["timer", "ngRoute", "vertoControllers", "vertoDirectives", "vertoFilters", "ngStorage", "ngAnimate", "ngSanitize", "toastr", "FBAngular", "cgPrompt", "720kb.tooltips", "ui.gravatar", "ui.bootstrap", "directive.g+signin", "pascalprecht.translate", "angular-click-outside"]);
    a.constant("configLanguages", {
        languages: [{
            id: "en",
            name: "English"
        }, {
            id: "it",
            name: "Italiano"
        }, {
            id: "fr",
            name: "Français"
        }, {
            id: "de",
            name: "Deutsch"
        }, {
            id: "pt",
            name: "Português"
        }, {
            id: "pl",
            name: "Polski"
        }, {
            id: "zh",
            name: "中國"
        }, {
            id: "ru",
            name: "Pусский"
        }, {
            id: "sv",
            name: "Svenska"
        }, {
            id: "da",
            name: "Dansk"
        }, {
            id: "es",
            name: "Español"
        }, {
            id: "id",
            name: "Indonesia"
        }],
        dialects: {
            en: "en",
            en_GB: "en",
            en_US: "en",
            it: "it",
            it_IT: "it",
            fr: "fr",
            fr_FR: "fr",
            fr_CA: "fr",
            pt: "pt",
            pt_BR: "pt",
            pt_PT: "pt",
            de: "de",
            de_DE: "de",
            es: "es",
            es_ES: "es",
            pl: "pl",
            pl_PL: "pl",
            ru: "ru",
            ru_RU: "ru",
            sv: "sv",
            sv_SV: "sv",
            sv_FI: "sv",
            da: "da",
            da_DK: "da",
            id: "id",
            id_ID: "id",
            zh: "zh",
            zh_CN: "zh",
            zh_TW: "zh",
            zh_HK: "zh"
        }
    }), a.config(["$routeProvider", "gravatarServiceProvider", "$translateProvider", "configLanguages", function(a, b, c, d) {
        a.when("/", {
            title: "Loading",
            templateUrl: "partials/splash_screen.html",
            controller: "SplashScreenController"
        }).when("/login", {
            title: "Login",
            templateUrl: "partials/login.html",
            controller: "LoginController"
        }).when("/dialpad", {
            title: "Dialpad",
            templateUrl: "partials/dialpad.html",
            controller: "DialPadController"
        }).when("/incall", {
            title: "In a Call",
            templateUrl: "partials/incall.html",
            controller: "InCallController"
        }).when("/loading", {
            title: "Loading Verto Communicator",
            templateUrl: "partials/loading.html",
            controller: "LoadingController"
        }).when("/preview", {
            title: "Preview Video",
            templateUrl: "partials/preview.html",
            controller: "PreviewController"
        }).when("/browser-upgrade", {
            title: "",
            templateUrl: "partials/browser_upgrade.html",
            controller: "BrowserUpgradeController"
        }).otherwise({
            redirectTo: "/"
        }), b.defaults = {
            "default": "mm"
        };
        var e = [];
        angular.forEach(d.languages, function(a, b) {
            e.push(a.id)
        }), c.useStaticFilesLoader({
            prefix: "locales/locale-",
            suffix: ".json"
        }).registerAvailableLanguageKeys(e, d.dialects).preferredLanguage("en").determinePreferredLanguage().fallbackLanguage("en").useSanitizeValueStrategy(null)
    }]), a.run(["$rootScope", "$location", "toastr", "prompt", "verto", function(a, b, c, d, e) {
        a.$on("$routeChangeStart", function(a, c, d) {
            e.data.connected || "partials/login.html" === c.templateUrl || b.path("/")
        }), a.$on("$routeChangeSuccess", function(b, c, d) {
            a.title = c.$$route.title
        }), a.safeProtocol = !1, "https:" == window.location.protocol && (a.safeProtocol = !0), a.promptInput = function(a, b, c, e) {
            d({
                title: a,
                message: b,
                input: !0,
                label: c
            }).then(function(a) {
                angular.isFunction(e) && e(a)
            }, function() {})
        }
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers", ["ui.bootstrap", "vertoService", "storageService", "ui.gravatar"])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("SplashScreenController", ["$scope", "$rootScope", "$location", "$timeout", "storage", "splashscreen", "prompt", "verto", function(a, b, c, d, e, f, g, h) {
        console.debug("Executing SplashScreenController."), a.progress_percentage = f.progress_percentage, a.message = "", a.interrupt_next = !1, a.errors = [];
        var i = function(a, b) {
                b && "browser-upgrade" == b && (a = b), c.path(a)
            },
            j = function(b, c, d, e, g, h, j) {
                if (a.progress_percentage = f.calculate(b), a.message = j, h && "error" == c) {
                    if (a.errors.push(j), !g) return void i("", e);
                    j += ". Continue?", confirm(j) || (a.interrupt_next = !0)
                }
                return a.interrupt_next ? void 0 : (a.message = f.getProgressMessage(b + 1), !0)
            };
        b.$on("progress.next", function(a, b, c, e, g, h, i, k) {
            d(function() {
                return e ? void e.then(function(a) {
                    k = a.message, c = a.status, j(b, c, e, g, h, i, k) && f.next()
                }) : void(j(b, c, e, g, h, i, k) && f.next())
            }, 400)
        }), b.$on("progress.complete", function(b, d) {
            a.message = "Complete", h.data.connected ? c.path("/dialpad") : (i("/login"), c.path("/login"))
        }), f.next()
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("BrowserUpgradeController", ["$scope", "$http", "$location", "verto", "storage", "Fullscreen", function(a, b, c, d, e, f) {
        console.debug("Executing BrowserUpgradeController.")
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("ChatController", ["$scope", "$rootScope", "$http", "$location", "$anchorScroll", "$timeout", "verto", "prompt", "$translate", function(a, b, c, d, e, f, g, h, i) {
        function j() {
            var a = document.querySelector(".chat-messages");
            a.scrollTop = a.scrollHeight
        }

        function k() {
            a.members = [], a.messages = [], a.message = r
        }

        function l(a) {
            for (var b = g.data.confLayoutsData, c = 0; c < b.length; c++)
                if (b[c].name === a) return b[c].resIDS
        }

        function m(b) {
            a.members.forEach(function(c) {
                var d = c.status.video.reservationID;
                console.debug("resID to clear: " + d), d && b && -1 !== b.indexOf(d) || d && (console.debug("clearing resid [" + d + "] from [" + c.id + "]"), a.confResID(c.id, d))
            })
        }

        function n(b) {
            var c = !1;
            for (var d in a.members) {
                var e = a.members[d];
                if (e.uuid == b) {
                    c = !0;
                    break
                }
            }
            return c ? d : -1
        }

        function o(a) {
            return {
                uuid: a[0],
                id: a[1][0],
                number: a[1][1],
                name: a[1][2],
                codec: a[1][3],
                status: JSON.parse(a[1][4]),
                email: a[1][5].email
            }
        }

        function p(b) {
            a.members.push(o(b))
        }

        function q(a, b) {
            h({
                title: a,
                input: !0,
                label: "",
                value: ""
            }).then(function(a) {
                a && b && b(a)
            })
        }
        console.debug("Executing ChatController.");
        var r = "";
        k(), a.$watch("activePane", function() {
            "chat" == a.activePane && (b.chat_counter = 0), b.activePane = a.activePane
        }), b.$on("chat.newMessage", function(c, d) {
            d.created_at = new Date, console.log("chat.newMessage", d), a.$apply(function() {
                a.messages.push(d), d.from == g.data.name || a.chatStatus || "chat" == a.activePane || ++b.chat_counter, f(function() {
                    j()
                }, 300)
            })
        }), b.$on("call.conference", function(b, c) {
            f(function() {
                a.conf = g.data.conf.params.laData
            })
        }), b.$on("changedVideoLayout", function(b, c) {
            a.resIDs = l(c), m(a.resIDs)
        }), b.$on("conference.canvasInfo", function(b, c) {
            a.currentLayout = c[0].layoutName, a.resIDs = l(a.currentLayout)
        }), b.$on("hangupCall", function() {
            a.openId = null
        }), b.$on("members.boot", function(b, c) {
            a.$apply(function() {
                k();
                for (var a in c) {
                    var b = c[a];
                    p(b)
                }
            })
        }), b.$on("members.add", function(b, c) {
            a.$apply(function() {
                p(c)
            })
        }), b.$on("members.del", function(c, d) {
            b.watcher && b.master === d && (g.hangup(), window.close()), a.$apply(function() {
                var b = n(d); - 1 != b && a.members.splice(b, 1)
            })
        }), b.$on("members.update", function(b, c) {
            c = o(c);
            var d = n(c.uuid);
            0 > d ? console.log("Didn't find the member uuid " + c.uuid) : a.$apply(function() {
                parseInt(c.id) == parseInt(g.data.conferenceMemberID) && (g.data.mutedMic = c.status.audio.muted, g.data.mutedVideo = c.status.video.muted, g.data.call.setMute(c.status.audio.muted ? "off" : "on"), g.data.call.setVideoMute(c.status.video.muted ? "off" : "on")), angular.extend(a.members[d], c)
            })
        }), b.$on("members.clear", function(b) {
            a.$applyAsync(function() {
                k(), a.closeChat()
            })
        }), a.toggleModMenu = function(b) {
            "moderator" == g.data.confRole && (a.openId = a.openId == b ? null : b)
        }, a.send = function(b) {
            b && "keydown" == b.type && b.preventDefault(), g.sendConferenceChat(a.message), a.message = r
        }, a.confKick = function(a) {
            console.log("$scope.confKick"), g.data.conf.kick(a)
        }, a.confMuteMic = function(a) {
            "moderator" == g.data.confRole && (console.log("$scope.confMuteMic"), g.data.conf.muteMic(a))
        }, a.confMuteVideo = function(a) {
            "moderator" == g.data.confRole && (console.log("$scope.confMuteVideo"), g.data.conf.muteVideo(a))
        }, a.confPresenter = function(a) {
            console.log("$scope.confPresenter"), g.data.conf.presenter(a)
        }, a.confResID = function(a, b) {
            console.log("Set", a, "to", b), g.setResevartionId(a, b)
        }, a.confVideoFloor = function(a) {
            console.log("$scope.confVideoFloor"), g.data.conf.videoFloor(a)
        }, a.confBanner = function(a) {
            console.log("$scope.confBanner"), h({
                title: i.instant("TITLE_INSERT_BANNER"),
                input: !0,
                label: "",
                value: ""
            }).then(function(b) {
                b && g.data.conf.banner(a, b)
            })
        }, a.confCanvasIn = function(a, b) {
            return b ? void g.setCanvasIn(a, b) : void q(i.instant("TITLE_INSERT_CANVAS_ID"), function(b) {
                console.log(a, b), g.setCanvasIn(a, b)
            })
        }, a.confCanvasOut = function(a, b) {
            return b ? void g.setCanvasOut(a, b) : void q(i.instant("TITLE_INSERT_CANVAS_ID"), function(b) {
                g.setCanvasOut(a, b)
            })
        }, a.confLayer = function(a, b) {
            return b ? void g.setLayer(a, b) : void q(i.instant("TITLE_INSERT_LAYER"), function(b) {
                g.setLayer(a, b)
            })
        }, a.confResetBanner = function(a) {
            console.log("$scope.confResetBanner");
            var b = "reset";
            g.data.conf.banner(a, b)
        }, a.confVolumeDown = function(a) {
            console.log("$scope.confVolumeDown"), g.data.conf.volumeDown(a)
        }, a.confVolumeUp = function(a) {
            console.log("$scope.confVolumeUp"), g.data.conf.volumeUp(a)
        }, a.confGainDown = function(a) {
            console.log("$scope.confGainDown"), g.data.conf.gainDown(a)
        }, a.confGainUp = function(a) {
            console.log("$scope.confGainUp"), g.data.conf.gainUp(a)
        }, a.confTransfer = function(a) {
            console.log("$scope.confTransfer"), b.disableOnKeydownDtmf(), h({
                title: i.instant("TITLE_TRANSFER"),
                message: i.instant("MESSAGE_TRANSFER"),
                input: !0,
                label: i.instant("LABEL_TRANSFER"),
                value: ""
            }).then(function(c) {
                b.enableOnKeydownDtmf(), c && g.data.conf.transfer(a, c)
            })["catch"](function() {
                b.enableOnKeydownDtmf()
            })
        }, a.confToggleDeaf = function(a) {
            "moderator" == g.data.confRole && (console.log("$scope.confToggleDeaf"), a.status.audio.deaf ? g.data.conf.undeaf(a.id) : g.data.conf.deaf(a.id))
        }
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("ContributorsController", ["$scope", "$http", "toastr", function(a, b, c) {
        var d = window.location.origin + window.location.pathname;
        b.get(d + "contributors.txt").success(function(b) {
            var c = [];
            angular.forEach(b, function(a, b) {
                var c = /(.*) <(.*)>/,
                    d = a.replace(c, "$1"),
                    e = a.replace(c, "$2");
                this.push({
                    name: d,
                    email: e
                })
            }, c), a.contributors = c
        }).error(function() {
            c.error("contributors not found.")
        })
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("AboutController", ["$scope", "$http", "toastr", function(a, b, c) {
        var d = "dd0bb0e";
        a.githash = d
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("DialPadController", ["$rootScope", "$scope", "$http", "$location", "toastr", "verto", "storage", "CallHistory", "eventQueue", "$timeout", function(a, b, c, d, e, f, g, h, i, j) {
        function k(b) {
            return g.data.onHold = !1, g.data.cur_call = 0, a.dialpadNumber = b, !a.dialpadNumber && g.data.called_number ? (a.dialpadNumber = g.data.called_number, !1) : a.dialpadNumber || g.data.called_number ? f.data.call ? (console.debug("A call is already in progress."), !1) : -1 != b.indexOf("-canvas-") ? (a.watcher = !0, f.call(a.dialpadNumber, null, {
                useCamera: "none",
                useMic: "none",
                useSpeak: "none",
                caller_id_name: null,
                userVariables: {},
                caller_id_number: null,
                mirrorInput: !1
            }), void d.path("/incall")) : (g.data.mutedVideo = !1, g.data.mutedMic = !1, g.data.videoCall = !1, f.call(a.dialpadNumber), g.data.called_number = a.dialpadNumber, h.add(a.dialpadNumber, "outbound"), void d.path("/incall")) : (e.warning("Enter an extension, please."), !1)
        }
        console.debug("Executing DialPadController."), i.process(), d.search().autocall && (a.dialpadNumber = d.search().autocall, delete d.search().autocall, k(a.dialpadNumber), a.watcher) || (b.call_history = h.all(), b.history_control = h.all_control(), b.has_history = Object.keys(b.call_history).length, g.data.videoCall = !1, g.data.userStatus = "connecting", g.data.calling = !1, b.clearCallHistory = function() {
            return h.clear(), b.call_history = h.all(), b.history_control = h.all_control(), b.has_history = Object.keys(b.call_history).length, b.history_control
        }, b.viewCallsList = function(a) {
            return b.call_list = a
        }, "autocall" in f.data && (a.dialpadNumber = f.data.autocall, delete f.data.autocall, k(a.dialpadNumber)), b.fillDialpadNumber = function(b) {
            a.dialpadNumber = b
        }, b.preview = function() {
            d.path("/preview")
        }, a.transfer = function() {
            return a.dialpadNumber ? void f.data.call.transfer(a.dialpadNumber) : !1
        }, b.loading = !1, b.cancelled = !1, a.call = function(c) {
            return g.data.testSpeedJoin && a.dialpadNumber ? (b.loading = !0, void f.testSpeed(function() {
                return b.cancelled ? (b.cancelled = !1, void(b.loading = !1)) : void k(c)
            })) : k(c)
        }, a.cancel = function() {
            b.cancelled = !0
        })
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("InCallController", ["$rootScope", "$scope", "$http", "$location", "$modal", "$timeout", "toastr", "verto", "storage", "prompt", "Fullscreen", "$translate", function(a, b, c, d, e, f, g, h, i, j, k, l) {
        function m() {
            b.conf = h.data.conf.params.laData, b.canvases = [{
                id: 1,
                name: "Super Canvas"
            }];
            for (var a = 1; a < b.conf.canvasCount; a++) b.canvases.push({
                id: a + 1,
                name: "Canvas " + (a + 1)
            })
        }
        console.debug("Executing InCallController."), b.layout = null, a.dialpadNumber = "", b.callTemplate = "partials/phone_call.html", b.dialpadTemplate = "", b.incall = !0, i.data.videoCall && (b.callTemplate = "partials/video_call.html"), a.$on("call.conference", function(a, c) {
            f(function() {
                b.chatStatus && b.openChat(), m()
            })
        }), a.$on("call.video", function(a, c) {
            f(function() {
                b.callTemplate = "partials/video_call.html"
            })
        }), b.toggleDialpad = function() {
            b.openModal("partials/dialpad_widget.html", "ModalDialpadController")
        }, b.videoCall = function() {
            j({
                title: l.instant("TITLE_ENABLE_VIDEO"),
                message: l.instant("MESSAGE_ENABLE_VIDEO")
            }).then(function() {
                i.data.videoCall = !0, b.callTemplate = "partials/video_call.html"
            })
        }, b.cbMuteVideo = function(a, b) {
            i.data.mutedVideo = !i.data.mutedVideo
        }, b.cbMuteMic = function(a, b) {
            i.data.mutedMic = !i.data.mutedMic
        }, b.confChangeVideoLayout = function(c, d) {
            h.data.conf.setVideoLayout(c, d), b.videoLayout = c, a.$emit("changedVideoLayout", c)
        }, b.confChangeSpeaker = function(b) {
            i.data.selectedSpeaker = b, a.$emit("changedSpeaker", b)
        }, b.confPopup = function(a) {
            var b = (document.getElementById("webcam"), window.location.href),
                c = h.data.call.callID,
                d = h.data.call.params.remote_caller_id_number,
                e = webcam.offsetWidth,
                f = webcam.offsetHeight + 100,
                g = (screen.width - e) / 2,
                i = (screen.height - f) / 2;
            b = b.replace(/\#.*/, ""), b += "#/?sessid=random&master=" + c + "&watcher=true&extension=" + d + "&canvas_id=" + a, console.log("opening new window to " + b);
            var j = window.open(b, "canvas_window_" + a, "toolbar=0,location=0,menubar=0,directories=0,width=" + e + ",height=" + f, NaN + g + ",top=" + i);
            j.moveTo(g, i)
        }, b.screenshare = function() {
            return h.data.shareCall ? (h.screenshareHangup(), !1) : void(h.data.conf ? (console.log("Screenshare inside conferece: ", h.data.conf), h.screenshare(h.data.conf.params.laData.laName)) : h.screenshare(i.data.called_number))
        }, b.muteMic = h.muteMic, b.muteVideo = h.muteVideo, a.$on("ScreenShareExtensionStatus", function(a, b) {
            var c = "https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk";
            switch (b) {
                case "permission-denied":
                    g.info("Please allow the plugin in order to use Screen Share", "Error");
                    break;
                case "not-installed":
                    g.warning('Please <a target="_blank" class="install" href="' + c + '">install</a> the plugin in order to use Screen Share', "Warning", {
                        allowHtml: !0
                    });
                    break;
                case "installed-disabled":
                    g.info("Please enable the plugin in order to use Screen Share", "Error")
            }
        }), f(function() {
            console.log("broadcast time-start incall"), b.$broadcast("timer-start")
        }, 1e3)
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("LoginController", ["$scope", "$http", "$location", "verto", function(a, b, c, d) {
        var e = function() {
            d.data.connected && c.path("/dialpad")
        };
        e(), d.data.name = a.storage.data.name, d.data.email = a.storage.data.email, console.debug("Executing LoginController.")
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("MainController", ["$scope", "$rootScope", "$location", "$modal", "$timeout", "$q", "verto", "storage", "CallHistory", "toastr", "Fullscreen", "prompt", "eventQueue", "$translate", "$window", function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
        function p(c, d) {
            if (!b.ws_modalInstance) {
                var e = {
                    backdrop: "static",
                    keyboard: !1
                };
                a.showReconnectModal && (b.ws_modalInstance = a.openModal("partials/ws_reconnect.html", "ModalWsReconnectController", e))
            }
        }

        function q(a, c) {
            h.data.autoBand && g.testSpeed(), b.ws_modalInstance && (b.ws_modalInstance.close(), b.ws_modalInstance = null)
        }

        function r() {
            gapi.client.plus.people.get({
                userId: "me"
            }).execute(s)
        }

        function s(b) {
            for (var c, d = 0; d < b.emails.length; d++) "account" === b.emails[d].type && (c = b.emails[d].value);
            console.debug("Primary Email: " + c), console.debug("display name: " + b.displayName), console.debug("imageurl: " + b.image.url), console.debug(b), console.debug(g.data), g.data.email = c, g.data.name = b.displayName, h.data.name = g.data.name, h.data.email = g.data.email, a.login()
        }

        function t(a, b) {
            a ? j.info('Speaker is now <span class="install">' + b + "</a>", "Success", {
                allowHtml: !0
            }) : j.error("Your browser doesn't seem to support this feature", "Error")
        }

        function u(c) {
            var d = c.key;
            b.onKeydownDtmfEnabled && d.match(/^(\*|\#|[0-9a-dA-D])$/g) && (b.dtmfWidget(d), a.$applyAsync())
        }
        if (console.debug("Executing MainController."), b.dtmfHistory = {
                value: ""
            }, b.onKeydownDtmfEnabled = !0, $.verto.haltClosure = function() {
                return "active" == g.data.callState ? !0 : void 0
            }, h.data.language && "browser" !== h.data.language ? n.use(h.data.language) : h.data.language = "browser", b.master = c.search().master, "true" === c.search().watcher) {
            b.watcher = !0, angular.element(document.body).addClass("watcher");
            var v, w = v = c.search().extension,
                x = c.search().canvas_id;
            v && (x && (v += "-canvas-" + x), b.extension = w, b.canvasID = x, c.search().autocall = v)
        }
        var y = document.getElementById("webcam");
        a.verto = g, a.storage = h, a.call_history = angular.element("#call_history").hasClass("active"), b.chatStatus = angular.element("#wrapper").hasClass("toggled"), a.showReconnectModal = !0, b.chat_counter = 0, b.activePane = "members", b.dialpadNumber = "", g.data.connected || (console.debug("MainController: WebSocket not connected. Redirecting to login."), c.path("/")), b.$on("config.http.success", function(b) {
            a.login(!1)
        }), b.$on("changedSpeaker", function(a, b) {
            g.data.call && g.data.call.setAudioPlaybackDevice(b, t)
        }), a.login = function(b) {
            void 0 == b && (b = !0);
            var d = function(d, e) {
                a.$apply(function() {
                    g.data.connecting = !1, e && (h.data.hostname = g.data.hostname, h.data.wsURL = g.data.wsURL, h.data.ui_connected = g.data.connected, h.data.ws_connected = g.data.connected, h.data.name = g.data.name, h.data.email = g.data.email, h.data.login = g.data.login, h.data.password = g.data.password, h.data.autoBand && g.testSpeed(), b && h.data.preview ? c.path("/loading") : b && c.path("/dialpad"))
                })
            };
            g.data.connecting = !0, g.connect(d)
        }, b.logout = function() {
            var b = function() {
                var b = function(a, b) {
                    console.debug("Redirecting to login page."), h.reset(), "undefined" != typeof gapi && (console.debug(gapi), gapi.auth.signOut()), c.path("/login")
                };
                g.data.call && g.hangup(), a.closeChat(), a.showReconnectModal = !1, g.disconnect(b), g.hangup()
            };
            g.data.call ? l({
                title: n.instant("TITLE_ACTIVE_CALL"),
                message: n.instant("MESSAGE_ACTIVE_CALL_HANGUP")
            }).then(function() {
                b()
            }) : b()
        }, a.openModalSettings = function() {
            var b = d.open({
                animation: a.animationsEnabled,
                templateUrl: "partials/modal_settings.html",
                controller: "ModalSettingsController"
            });
            b.result.then(function(a) {
                console.log(a)
            }, function() {
                console.info("Modal dismissed at: " + new Date)
            }), b.rendered.then(function() {
                jQuery.material.init()
            })
        }, b.openModal = function(b, c, e) {
            var f = {
                animation: a.animationsEnabled,
                templateUrl: b,
                controller: c
            };
            angular.extend(f, e);
            var g = d.open(f);
            return g.result.then(function(a) {
                console.log(a)
            }, function() {
                console.info("Modal dismissed at: " + new Date)
            }), g.rendered.then(function() {
                jQuery.material.init()
            }), g
        }, b.$on("ws.close", p), b.$on("ws.login", q), b.ws_modalInstance, a.showAbout = function() {
            a.openModal("partials/about.html", "AboutController")
        }, a.showContributors = function() {
            a.openModal("partials/contributors.html", "ContributorsController")
        }, b.dtmf = function(a) {
            console.log("dtmf", a), b.dialpadNumber = b.dialpadNumber + a, g.data.call && g.dtmf(a)
        }, b.backspace = function() {
            var a = b.dialpadNumber,
                c = a.length;
            b.dialpadNumber = a.substring(0, c - 1)
        }, a.toggleCallHistory = function() {
            a.call_history ? (angular.element("#call_history").removeClass("active"), angular.element("#call-history-wrapper").removeClass("active")) : (angular.element("#call_history").addClass("active"), angular.element("#call-history-wrapper").addClass("active")), a.call_history = angular.element("#call_history").hasClass("active")
        }, a.toggleChat = function() {
            b.chatStatus && "chat" === b.activePane && (b.chat_counter = 0), angular.element("#wrapper").toggleClass("toggled"), b.chatStatus = angular.element("#wrapper").hasClass("toggled"), updateVideoSize()
        }, b.openChat = function() {
            b.chatStatus = !1, angular.element("#wrapper").removeClass("toggled")
        }, a.closeChat = function() {
            b.chatStatus = !0, angular.element("#wrapper").addClass("toggled")
        }, a.toggleSettings = function() {
            var a = angular.element(document.querySelector("#settings"));
            a.toggleClass("toggled"), b.$emit("toggledSettings", a.hasClass("toggled"))
        }, a.closeSettings = function() {
            var a = angular.element(document.querySelector("#settings"));
            a.hasClass("toggled") && (a.removeClass("toggled"), b.$emit("toggledSettings", a.hasClass("toggled")))
        }, a.goFullscreen = function() {
            "connected" === h.data.userStatus && (b.fullscreenEnabled = !k.isEnabled(), k.isEnabled() ? k.cancel() : k.enable(document.getElementsByTagName("body")[0]))
        }, b.$on("call.video", function(a) {
            h.data.videoCall = !0
        }), b.$on("call.hangup", function(a, d) {
            k.isEnabled() && k.cancel(), b.chatStatus || (angular.element("#wrapper").toggleClass("toggled"), b.chatStatus = angular.element("#wrapper").hasClass("toggled")), b.dialpadNumber = "", console.debug("Redirecting to dialpad page."), c.path("/dialpad");
            try {
                b.$digest()
            } catch (e) {
                console.log("not digest")
            }
        }), b.$on("page.incall", function(a, b) {
            var d = function() {
                return f(function(a, b) {
                    h.data.askRecoverCall ? l({
                        title: n.instant("TITLE_ACTIVE_CALL"),
                        message: n.instant("MESSAGE_ACTIVE_CALL_BACK")
                    }).then(function() {
                        console.log("redirect to incall page"), c.path("/incall")
                    }, function() {
                        h.data.userStatus = "connecting", g.hangup()
                    }) : (console.log("redirect to incall page"), c.path("/incall")), a()
                })
            };
            m.events.push(d)
        }), a.$on("event:google-plus-signin-success", function(a, b) {
            console.log("Google+ Login Success"), console.log(b), gapi.client.load("plus", "v1", r)
        }), a.$on("event:google-plus-signin-failure", function(a, b) {
            console.log("Google+ Login Failure")
        }), b.callActive = function(d, f) {
            g.data.mutedMic = h.data.mutedMic, g.data.mutedVideo = h.data.mutedVideo, h.data.cur_call || (h.data.call_start = new Date), h.data.userStatus = "connected";
            var i = new Date(h.data.call_start);
            b.start_time = i, e(function() {
                a.$broadcast("timer-start")
            }), y.play(), h.data.calling = !1, h.data.cur_call = 1, c.path("/incall"), f.useVideo && b.$emit("call.video", "video")
        }, b.$on("call.active", function(a, c, d) {
            b.callActive(c, d)
        }), b.$on("call.calling", function(a, b) {
            h.data.calling = !0
        }), b.$on("call.incoming", function(d, e) {
            console.log("Incoming call from: " + e), h.data.cur_call = 0, a.incomingCall = !0, h.data.videoCall = !1, h.data.mutedVideo = !1, h.data.mutedMic = !1, l({
                title: n.instant("TITLE_INCOMING_CALL"),
                message: n.instant("MESSAGE_INCOMING_CALL") + e
            }).then(function() {
                var d = new Date(h.data.call_start);
                b.start_time = d, console.log(b.start_time), a.answerCall(), h.data.called_number = e, i.add(e, "inbound", !0), c.path("/incall")
            }, function() {
                a.declineCall(), i.add(e, "inbound", !1)
            })
        }), a.hold = function() {
            h.data.onHold = !h.data.onHold, g.data.call.toggleHold()
        }, a.hangup = function() {
            return g.data.call ? b.watcher ? void window.close() : (g.data.shareCall && g.screenshareHangup(), g.hangup(), b.$emit("hangupCall"), void c.path("/dialpad")) : (j.warning(n.instant("MESSAGE_NO_HANGUP_CALL")), void c.path("/dialpad"))
        }, a.answerCall = function() {
            h.data.onHold = !1, g.data.call.answer({
                useStereo: h.data.useStereo,
                useCamera: h.data.selectedVideo,
                useVideo: h.data.useVideo,
                useMic: h.data.useMic,
                callee_id_name: g.data.name,
                callee_id_number: g.data.login
            }), c.path("/incall")
        }, a.declineCall = function() {
            a.hangup(), a.incomingCall = !1
        }, a.play = function() {
            a.promptInput(n.instant("MESSAGE_ENTER_FILENAME"), "", "File", function(a) {
                g.data.conf.play(a), console.log("play file :", a)
            })
        }, a.stop = function() {
            g.data.conf.stop()
        }, a.record = function() {
            a.promptInput(n.instant("MESSAGE_ENTER_FILENAME"), "", "File", function(a) {
                g.data.conf.record(a), console.log("recording file :", a)
            })
        }, a.stopRecord = function() {
            g.data.conf.stopRecord()
        }, a.snapshot = function() {
            a.promptInput(n.instant("MESSAGE_ENTER_FILENAME"), "", "File", function(a) {
                g.data.conf.snapshot(a), console.log("snapshot file :", a)
            })
        }, b.dtmfWidget = function(a) {
            b.dtmfHistory.value = b.dtmfHistory.value + a, g.data.call && g.dtmf(a)
        }, b.disableOnKeydownDtmf = function() {
            b.onKeydownDtmfEnabled = !1
        }, b.enableOnKeydownDtmf = function() {
            b.onKeydownDtmfEnabled = !0
        }, b.$on("$routeChangeStart", function(a, c, d) {
            "/incall" === c.$$route.originalPath ? (b.dtmfHistory.value = "", angular.element(o).bind("keydown", u)) : angular.element(o).unbind("keydown", u)
        })
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("MenuController", ["$scope", "$http", "$location", "verto", "storage", "$rootScope", function(a, b, c, d, e, f) {
        console.debug("Executing MenuController."), a.storage = e, f.$on("testSpeed", function(b, c) {
            var f = e.data.vidQual,
                g = 4;
            a.bandDown = c.downKPS, a.bandUp = c.upKPS, c.downKPS < 2e3 && g--, c.upKPS < 2e3 && g--, a.iconClass = "mdi-device-signal-wifi-4-bar green", 4 > g ? a.iconClass = "mdi-device-signal-wifi-3-bar yellow" : 2 > g && (a.iconClass = "mdi-device-signal-wifi-1-bar red"), d.videoQuality.forEach(function(b) {
                b.id == f && (a.vidRes = b.label)
            }), a.$apply()
        })
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("ModalDialpadController", ["$scope", "$modalInstance", function(a, b) {
        a.ok = function() {
            b.close("Ok.")
        }, a.cancel = function() {
            b.dismiss("cancel")
        }
    }])
}(),
function() {
    "use strict";

    function a(a, b, c, d) {
        function e() {
            a.ws_modalInstance && d.data.instance && (d.data.instance.rpcClient.stopRetrying(), a.ws_modalInstance.close(), delete d.data.instance)
        }
        console.debug("Executing ModalWsReconnectController"), b.closeReconnect = e
    }
    angular.module("vertoControllers").controller("ModalWsReconnectController", a), a.$inject = ["$rootScope", "$scope", "storage", "verto"]
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("ModalLoginInformationController", ["$scope", "$http", "$location", "$modalInstance", "verto", "storage", function(a, b, c, d, e, f) {
        console.debug("Executing ModalLoginInformationController."), a.verto = e, a.storage = f, a.ok = function() {
            d.close("Ok.")
        }, a.cancel = function() {
            d.dismiss("cancel")
        }, e.data.name = f.data.name, e.data.email = f.data.email
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("SettingsController", ["$scope", "$http", "$location", "$rootScope", "storage", "verto", "$translate", "toastr", "configLanguages", function(a, b, c, d, e, f, g, h, i) {
        console.debug("Executing ModalSettingsController."), $.material.init(), a.speakerFeature = "undefined" != typeof document.getElementById("webcam").sinkId, a.storage = e, a.verto = f, a.mydata = angular.copy(e.data), a.languages = i.languages, a.languages.unshift({
            id: "browser",
            name: g.instant("BROWSER_LANGUAGE")
        }), a.mydata.language = e.data.language || "browser", d.$on("$translateChangeSuccess", function() {
            g("BROWSER_LANGUAGE").then(function(b) {
                a.languages[0].name = b
            })
        }), d.$on("toggledSettings", function(b, c) {
            c ? a.mydata = angular.copy(e.data) : a.ok()
        }), a.ok = function() {
            console.log("Camera Selected is", a.mydata.selectedVideo, a.verto.data.videoDevices), angular.forEach(f.data.videoDevices, function(b) {
                console.log("checking video ", b), b.id == a.mydata.selectedVideo && (a.mydata.selectedVideoName = b.label, console.log("Setting selectedVideoName to ", b.label))
            }), a.mydata.selectedSpeaker != e.data.selectedSpeaker && d.$emit("changedSpeaker", a.mydata.selectedSpeaker), e.changeData(a.mydata), f.data.instance.iceServers(e.data.useSTUN), e.data.autoBand && a.testSpeed();
            var b = {
                googEchoCancellation: void 0 === e.data.googEchoCancellation ? !0 : e.data.googEchoCancellation,
                googNoiseSuppression: void 0 === e.data.googNoiseSuppression ? !0 : e.data.googNoiseSuppression,
                googHighpassFilter: void 0 === e.data.googHighpassFilter ? !0 : e.data.googHighpassFilter,
                googAutoGainControl: void 0 === e.data.googAutoGainControl ? !0 : e.data.googAutoGainControl,
                googAutoGainControl2: void 0 === e.data.googAutoGainControl ? !0 : e.data.googAutoGainControl
            };
            f.data.instance.options.audioParams = b
        }, a.changedLanguage = function(a) {
            if ("browser" === a) {
                e.data.language = "browser";
                var b = g.preferredLanguage();
                g.use(b).then(function(a) {}, function(a) {
                    g.use("en")
                })
            } else g.use(a), e.data.language = a
        }, a.refreshDeviceList = function() {
            return f.refreshDevices()
        }, a.showPreview = function() {
            var a = angular.element(document.querySelector("#settings"));
            return a.toggleClass("toggled"), f.data.call ? void h.warning(g.instant("MESSAGE_DISPLAY_SETTINGS")) : void c.path("/preview")
        }, a.testSpeed = function() {
            function b(b) {
                a.mydata.vidQual = e.data.vidQual, a.speedMsg = "Up: " + b.upKPS + " Down: " + b.downKPS, a.isTestingSpeed = !1, a.$apply()
            }
            return a.isTestingSpeed = !0, f.testSpeed(b)
        }, a.resetSettings = function() {
            confirm("Factory Reset Settings?") && (e.factoryReset(), a.logout(), window.location.reload())
        }, a.checkAutoBand = function(b) {
            a.mydata.useDedenc = !1;
            var c = videoQuality[videoQuality.length - 1];
            a.mydata.vidQual = c.id, e.data.vidQual = c.id, f.data.instance.videoParams({
                minWidth: c.width,
                minHeight: c.height,
                maxWidth: c.width,
                maxHeight: c.height,
                minFrameRate: 15,
                vertoBestFrameRate: e.data.bestFrameRate
            }), e.data.vidQual = c.id, b ? a.mydata.testSpeedJoin = !0 : (a.mydata.outgoingBandwidth = "default", a.mydata.incomingBandwidth = "default", a.mydata.testSpeedJoin = !1)
        }, a.checkUseDedRemoteEncoder = function(b) {
            -1 != ["0", "default", "5120"].indexOf(b) ? a.mydata.useDedenc = !1 : a.mydata.useDedenc = !0
        }, a.checkVideoQuality = function(a) {
            var b = videoResolution[a].width,
                c = videoResolution[a].height;
            e.data.vidQual = a, f.data.instance.videoParams({
                minWidth: b,
                minHeight: c,
                maxWidth: b,
                maxHeight: c,
                minFrameRate: 15,
                vertoBestFrameRate: e.data.bestFrameRate
            })
        }
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("PreviewController", ["$rootScope", "$scope", "$http", "$location", "$modal", "$timeout", "toastr", "verto", "storage", "prompt", "Fullscreen", "$translate", function(a, b, c, d, e, f, g, h, i, j, k, l) {
        function m(a) {
            if ("function" == typeof a) a.stop();
            else if (a.active) {
                var b = a.getTracks();
                b.forEach(function(a, b) {
                    a.stop()
                })
            }
        }

        function n(a) {
            t && m(t), t = a, FSRTCattachMediaStream(o, a), q && (r = q.createMediaStreamSource(a), s = createAudioMeter(q), r.connect(s))
        }
        b.storage = i, console.debug("Executing PreviewController.");
        var o = document.getElementById("videopreview"),
            p = document.querySelector("#mic-meter .volumes");
        p && (p = p.children), b.localVideo = function() {
            var a = {
                    mirrored: !0,
                    audio: {
                        optional: [{
                            sourceId: i.data.selectedAudio
                        }]
                    }
                },
                b = h.data.videoDevices.find(function(a) {
                    return a.id == i.data.selectedVideo
                });
            i.data.selectedVideo = b.id, i.data.selectedVideoName = b.label, "none" !== b.id && (a.video = {
                optional: [{
                    sourceId: b.id
                }]
            }), navigator.getUserMedia(a, n, function(a, b) {})
        };
        var q = null;
        "undefined" != typeof AudioContext && (q = new AudioContext);
        var r = null,
            s = null,
            t = {};
        b.refreshDeviceList = function() {
            return h.refreshDevices()
        }, b.videoCall = function() {
            j({
                title: l.instant("TITLE_ENABLE_VIDEO"),
                message: l.instant("MESSAGE_ENABLE_VIDEO")
            }).then(function() {
                i.data.videoCall = !0, b.callTemplate = "partials/video_call.html"
            })
        }, b.cbMuteVideo = function(a, b) {
            i.data.mutedVideo = !i.data.mutedVideo
        }, b.cbMuteMic = function(a, b) {
            i.data.mutedMic = !i.data.mutedMic
        }, b.confChangeVideoLayout = function(a) {
            h.data.conf.setVideoLayout(a)
        }, b.endPreview = function() {
            o.src = null, q && (s.shutdown(), s.onaudioprocess = null), m(t), d.path("/dialpad"), i.data.preview = !1
        }, b.localVideo()
    }])
}(),
function() {
    "use strict";
    angular.module("vertoControllers").controller("LoadingController", ["$rootScope", "$scope", "$location", "$interval", "verto", function(a, b, c, d, e) {
        console.log("Loading controller");
        var f;
        b.stopInterval = function() {
            d.cancel(f)
        }, f = d(function() {
            e.data.resCheckEnded && (b.stopInterval(), c.path("/preview"))
        }, 1e3)
    }])
}(),
function() {
    "use strict";
    angular.module("vertoDirectives", [])
}(),
function() {
    "use strict";
    angular.module("vertoDirectives").directive("autofocus", ["$timeout", function(a) {
        return {
            restrict: "A",
            link: function(b, c) {
                a(function() {
                    c[0].focus()
                })
            }
        }
    }])
}(),
function() {
    "use strict";
    angular.module("vertoDirectives").directive("showControls", ["Fullscreen", function(a) {
        var b = function(b, c, d) {
            var e = null;
            jQuery(".video-footer").fadeIn("slow"), jQuery(".video-hover-buttons").fadeIn("slow"), c.parent().bind("mousemove", function() {
                a.isEnabled() && (clearTimeout(e), jQuery(".video-footer").fadeIn("slow"), jQuery(".video-hover-buttons").fadeIn(500), e = setTimeout(function() {
                    a.isEnabled() && (jQuery(".video-footer").fadeOut("slow"), jQuery(".video-hover-buttons").fadeOut(500))
                }, 3e3))
            }), c.parent().bind("mouseleave", function() {
                jQuery(".video-footer").fadeIn(), jQuery(".video-hover-buttons").fadeIn()
            })
        };
        return {
            link: b
        }
    }])
}(),
function() {
    "use strict";
    angular.module("vertoDirectives").directive("userStatus", function() {
        var a = function(a, b, c) {
            a.$watch("condition", function(a) {
                b.removeClass("connected"), b.removeClass("disconnected"), b.removeClass("connecting"), b.addClass(a)
            })
        };
        return {
            scope: {
                condition: "="
            },
            link: a
        }
    })
}(),
function() {
    "use strict";
    angular.module("vertoDirectives").directive("videoTag", function() {
        function a(a, b, c) {
            console.log("Moving the video to element.");
            var d = jQuery("#webcam"),
                e = document.getElementsByClassName("video-tag-wrapper");
            e[0].appendChild(document.getElementById("webcam")), $("#webcam").resize(function() {
                updateVideoSize()
            }), $(window).resize(function() {
                updateVideoSize()
            }), updateVideoSize(), d.removeClass("hide"), d.css("display", "block"), a.callActive("", {
                useVideo: !0
            }), b.on("$destroy", function() {
                console.log("Moving the video back to body."), d.addClass("hide").appendTo(jQuery("body")), $(window).unbind("resize")
            })
        }
        return {
            link: a
        }
    })
}(),
function() {
    "use strict";
    angular.module("vertoFilters", [])
}(),
function() {
    "use strict";
    angular.module("vertoFilters").filter("picturify", function() {
        var a = /<a (|target="\s*\S*" )href="(\s*\S*.(png|jpg|svg|gif|webp|bmp))">\s*\S*<\/a>/i,
            b = /data:image\/(\s*\S*);base64,((?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=))/g;
        return function(c, d, e) {
            var f = 0;
            d = d || 150, b.test(c) && (c = c.replace(b, '<a href="$1" target="_blank"><img class="chat-img" width="' + d + '" src="data:image/png;base64,$2"/></a>'));
            do c = c.replace(a, '<a $1href="$2"><img class="chat-img" width="' + d + '" src="$2"/></a>'); while ((!e || e && f++ < e) && a.test(c));
            return c
        }
    })
}(),
function() {
    "use strict";
    angular.module("vertoService", [])
}();
var videoQuality = [],
    videoQualitySource = [{
        id: "qqvga",
        label: "QQVGA 160x120",
        width: 160,
        height: 120
    }, {
        id: "qvga",
        label: "QVGA 320x240",
        width: 320,
        height: 240
    }, {
        id: "vga",
        label: "VGA 640x480",
        width: 640,
        height: 480
    }, {
        id: "qvga_wide",
        label: "QVGA WIDE 320x180",
        width: 320,
        height: 180
    }, {
        id: "vga_wide",
        label: "VGA WIDE 640x360",
        width: 640,
        height: 360
    }, {
        id: "hd",
        label: "HD 1280x720",
        width: 1280,
        height: 720
    }, {
        id: "hhd",
        label: "HHD 1920x1080",
        width: 1920,
        height: 1080
    }],
    videoResolution = {
        qqvga: {
            width: 160,
            height: 120
        },
        qvga: {
            width: 320,
            height: 240
        },
        vga: {
            width: 640,
            height: 480
        },
        qvga_wide: {
            width: 320,
            height: 180
        },
        vga_wide: {
            width: 640,
            height: 360
        },
        hd: {
            width: 1280,
            height: 720
        },
        hhd: {
            width: 1920,
            height: 1080
        }
    },
    bandwidth = [{
        id: "250",
        label: "250kb"
    }, {
        id: "500",
        label: "500kb"
    }, {
        id: "1024",
        label: "1mb"
    }, {
        id: "1536",
        label: "1.5mb"
    }, {
        id: "2048",
        label: "2mb"
    }, {
        id: "3196",
        label: "3mb"
    }, {
        id: "4192",
        label: "4mb"
    }, {
        id: "5120",
        label: "5mb"
    }, {
        id: "0",
        label: "No Limit"
    }, {
        id: "default",
        label: "Server Default"
    }],
    framerate = [{
        id: "15",
        label: "15 FPS"
    }, {
        id: "20",
        label: "20 FPS"
    }, {
        id: "30",
        label: "30 FPS"
    }],
    updateReq, updateVideoSize = function(a) {
        a || (a = 500), clearTimeout(updateReq), updateReq = setTimeout(function() {
            var a = jQuery("#webcam");
            a.width(""), a.height("");
            var b, c, d = a.width(),
                e = a.height(),
                f = d / e,
                g = jQuery("div.video-wrapper");
            d > e ? (b = g.width(), c = Math.round(g.width() / f)) : (c = g.height(), b = Math.round(g.height() / f)), a.width(b), a.height(c), console.log("Setting video size to " + b + "/" + c)
        }, a)
    },
    vertoService = angular.module("vertoService", ["ngCookies"]);
vertoService.service("verto", ["$rootScope", "$cookieStore", "$location", "storage", function(a, b, c, d) {
    function e(a) {
        k.shareCall = null, k.callState = "active", a.refreshDevices()
    }

    function f() {
        k.call = null, k.callState = null, k.conf = null, k.confLayouts = [], k.confRole = null, k.chattingWith = null, a.$emit("call.hangup", "hangup")
    }

    function g(b, c) {
        a.$emit("call.active", b, c)
    }

    function h() {
        a.$emit("call.calling", "calling")
    }

    function i(b) {
        a.$emit("call.incoming", b)
    }

    function j(a) {
        return console.debug("Attempting to sync supported and available resolutions"), console.debug("VQ length: " + videoQualitySource.length), console.debug(a), angular.forEach(videoQualitySource, function(b, c) {
            angular.forEach(a, function(a) {
                var c = a[0],
                    d = a[1];
                b.width == c && b.height == d && videoQuality.push(b)
            })
        }), console.debug("VQ length 2: " + videoQuality.length), k.videoQuality = videoQuality, console.debug(videoQuality), k.vidQual = videoQuality.length > 0 ? videoQuality[videoQuality.length - 1].id : null, console.debug(k.vidQual), videoQuality
    }
    var k = {
            instance: null,
            connected: !1,
            call: null,
            shareCall: null,
            callState: null,
            conf: null,
            confLayouts: [],
            confRole: null,
            chattingWith: null,
            liveArray: null,
            videoDevices: [],
            audioDevices: [],
            shareDevices: [],
            videoQuality: [],
            extension: b.get("verto_demo_ext") || window.fsSip.username,
            name: b.get("verto_demo_name") || window.fsSip.name,
            email: b.get("verto_demo_email") || window.fsSip.email,
            cid: b.get("verto_demo_cid") || window.fsSip.username,
            textTo: b.get("verto_demo_textto") || "1000",
            login: b.get("verto_demo_login") || window.fsSip.username,
            password: b.get("verto_demo_passwd") || window.fsSip.password,
            hostname: window.fsSip.domain,
            wsURL: "wss://" + window.location.host + "/sip/proxy?url=ws://" + window.fsSip.domain + ":8081",
            resCheckEnded: !1
        },
        l = {
            muteMic: !1,
            muteVideo: !1
        };
    return {
        data: k,
        callState: l,
        videoQuality: videoQuality,
        videoResolution: videoResolution,
        bandwidth: bandwidth,
        framerate: framerate,
        refreshDevicesCallback: function(a) {
            k.videoDevices = [{
                id: "none",
                label: "No Camera"
            }], k.shareDevices = [{
                id: "screen",
                label: "Screen"
            }], k.audioDevices = [{
                id: "any",
                label: "Default Microphone"
            }, {
                id: "none",
                label: "No Microphone"
            }], k.speakerDevices = [{
                id: "any",
                label: "Default Speaker"
            }], d.data.selectedShare || (d.data.selectedShare = k.shareDevices[0].id);
            for (var b in jQuery.verto.videoDevices) {
                var c = jQuery.verto.videoDevices[b];
                c.label ? k.videoDevices.push({
                    id: c.id,
                    label: c.label || c.id
                }) : k.videoDevices.push({
                    id: "Camera " + b,
                    label: "Camera " + b
                }), 0 != b || d.data.selectedVideo || (d.data.selectedVideo = c.id), c.label ? k.shareDevices.push({
                    id: c.id,
                    label: c.label || c.id
                }) : k.shareDevices.push({
                    id: "Share Device " + b,
                    label: "Share Device " + b
                })
            }
            for (var b in jQuery.verto.audioInDevices) {
                var c = jQuery.verto.audioInDevices[b];
                0 != b || d.data.selectedAudio || (d.data.selectedAudio = c.id), c.label ? k.audioDevices.push({
                    id: c.id,
                    label: c.label || c.id
                }) : k.audioDevices.push({
                    id: "Microphone " + b,
                    label: "Microphone " + b
                })
            }
            for (var b in jQuery.verto.audioOutDevices) {
                var c = jQuery.verto.audioOutDevices[b];
                0 != b || d.data.selectedSpeaker || (d.data.selectedSpeaker = c.id), c.label ? k.speakerDevices.push({
                    id: c.id,
                    label: c.label || c.id
                }) : k.speakerDevices.push({
                    id: "Speaker " + b,
                    label: "Speaker " + b
                })
            }
            console.debug("Devices were refreshed, checking that we have cameras.");
            var e = k.videoDevices.some(function(a) {
                    return console.log("Evaluating device ", a), a.label == d.data.selectedVideoName ? (console.log("Matched video selection by name: ", a.label), d.data.selectedVideo = a.id, !0) : a.id == d.data.selectedVideo && "none" !== d.data.selectedVideo
                }),
                f = k.shareDevices.some(function(a) {
                    return a.id == d.data.selectedShare
                }),
                g = k.audioDevices.some(function(a) {
                    return a.id == d.data.selectedAudio
                }),
                h = k.speakerDevices.some(function(a) {
                    return a.id == d.data.selectedSpeaker
                });
            console.log("Storage Video: ", d.data.selectedVideo), console.log("Video Flag: ", e), e || (d.data.selectedVideo = k.videoDevices[k.videoDevices.length - 1].id), f || (d.data.selectedShare = k.shareDevices[0].id), g || (d.data.selectedAudio = k.audioDevices[0].id), !h && k.speakerDevices.length > 0 && (d.data.selectedSpeaker = k.speakerDevices[0].id), 0 === k.videoDevices.length ? (console.log("No camera, disabling video."), k.canVideo = !1, k.videoDevices.push({
                id: "none",
                label: "No camera"
            })) : k.canVideo = !0, angular.isFunction(a) && a()
        },
        refreshDevices: function(a) {
            console.debug("Attempting to refresh the devices."), a ? jQuery.verto.refreshDevices(a) : jQuery.verto.refreshDevices(this.refreshDevicesCallback)
        },
        refreshVideoResolution: function(a) {
            if (console.debug("Attempting to refresh video resolutions."), k.instance) {
                var b = a.bestResSupported[0],
                    c = a.bestResSupported[1];
                1080 === c && (b = 1280, c = 720), j(a.validRes), !d.data.autoBand && d.data.vidQual && (b = videoResolution[d.data.vidQual].width, c = videoResolution[d.data.vidQual].height), k.instance.videoParams({
                    minWidth: b,
                    minHeight: c,
                    maxWidth: b,
                    maxHeight: c,
                    minFrameRate: 15,
                    vertoBestFrameRate: d.data.bestFrameRate
                }), videoQuality.forEach(function(a) {
                    b === a.width && c === a.height && (d.data.vidQual !== a.id || void 0 === d.data.vidQual) && (d.data.vidQual = a.id)
                }), k.resCheckEnded = !0
            } else console.debug("There is no instance of verto.")
        },
        connect: function(b) {
            function j(b, c, e) {
                a.$emit("call.video", "video"), a.$emit("call.conference", "conference"), k.chattingWith = e.chatID, k.confRole = e.role, k.conferenceMemberID = e.conferenceMemberID;
                var f = new $.verto.conf(b, {
                    dialog: c,
                    hasVid: d.data.useVideo,
                    laData: e,
                    chatCallback: function(b, c) {
                        var d = c.data.fromDisplay || c.data.from || "Unknown",
                            e = c.data.message || "";
                        a.$emit("chat.newMessage", {
                            from: d,
                            body: e
                        })
                    },
                    onBroadcast: function(b, c, d) {
                        if (console.log(">>> conf.onBroadcast:", arguments), "response" == d.action)
                            if ("list-videoLayouts" == d["conf-command"]) {
                                var e = [];
                                for (var f in d.responseData) e.push(d.responseData[f].name);
                                var g = e.sort(function(a, b) {
                                    var c = "group:" == a.substring(0, 6) ? !0 : !1,
                                        d = "group:" == b.substring(0, 6) ? !0 : !1;
                                    return (c || d) && c != d ? c ? -1 : 1 : a == b ? 0 : a > b ? 1 : -1
                                });
                                k.confLayoutsData = d.responseData, k.confLayouts = g
                            } else "canvasInfo" == d["conf-command"] ? (k.canvasInfo = d.responseData, a.$emit("conference.canvasInfo", d.responseData)) : a.$emit("conference.broadcast", d)
                    }
                });
                "moderator" == k.confRole && (console.log(">>> conf.listVideoLayouts();"), f.listVideoLayouts(), f.modCommand("canvasInfo")), k.conf = f, k.liveArray = new $.verto.liveArray(k.instance, e.laChannel, e.laName, {
                    subParams: {
                        callID: c ? c.callID : null
                    }
                }), k.liveArray.onErr = function(a, b) {
                    console.log("liveArray.onErr", a, b)
                }, k.liveArray.onChange = function(b, c) {
                    switch (c.action) {
                        case "bootObj":
                            a.$emit("members.boot", c.data), c.data.forEach(function(b) {
                                var c = b[0],
                                    d = angular.fromJson(b[1][4]);
                                c === k.call.callID && a.$apply(function() {
                                    k.mutedMic = d.audio.muted, k.mutedVideo = d.video.muted
                                })
                            });
                            break;
                        case "add":
                            var d = [c.key, c.data];
                            a.$emit("members.add", d);
                            break;
                        case "del":
                            var e = c.key;
                            a.$emit("members.del", e);
                            break;
                        case "clear":
                            a.$emit("members.clear");
                            break;
                        case "modify":
                            var d = [c.key, c.data];
                            a.$emit("members.update", d);
                            break;
                        default:
                            console.log("NotImplemented", c.action)
                    }
                }
            }

            function l() {
                console.log("stopConference()"), k.liveArray ? (k.liveArray.destroy(), console.log("Has data.liveArray."), a.$emit("members.clear"), k.liveArray = null) : console.log("Doesn't found data.liveArray."), k.conf && (k.conf.destroy(), k.conf = null)
            }

            function m() {
                var a = c.search().sessid;
                return "random" === a && (a = $.verto.genUUID(), c.search().sessid = a), k.instance && !k.instance.rpcClient.socketReady() ? (k.instance.rpcClient.stopRetrying(), k.instance.logout(), void k.instance.login()) : (k.instance = new jQuery.verto({
                    login: k.login + "@" + k.hostname,
                    passwd: k.password,
                    socketUrl: k.wsURL,
                    tag: "webcam",
                    ringFile: "sounds/bell_ring2.wav",
                    audioParams: {
                        googEchoCancellation: void 0 === d.data.googEchoCancellation ? !0 : d.data.googEchoCancellation,
                        googNoiseSuppression: void 0 === d.data.googNoiseSuppression ? !0 : d.data.googNoiseSuppression,
                        googHighpassFilter: void 0 === d.data.googHighpassFilter ? !0 : d.data.googHighpassFilter,
                        googAutoGainControl: void 0 === d.data.googAutoGainControl ? !0 : d.data.googAutoGainControl,
                        googAutoGainControl2: void 0 === d.data.googAutoGainControl ? !0 : d.data.googAutoGainControl
                    },
                    sessid: a,
                    iceServers: d.data.useSTUN
                }, o), n.reloaded = !1, jQuery.verto.unloadJobs.push(function() {
                    n.reloaded = !0
                }), void k.instance.deviceParams({
                    useCamera: d.data.selectedVideo,
                    useSpeak: d.data.selectedSpeaker,
                    useMic: d.data.selectedAudio,
                    onResCheck: n.refreshVideoResolution
                }))
            }
            console.debug("Attempting to connect to verto.");
            var n = this,
                o = {
                    onWSLogin: function(c, d) {
                        k.connected = d, a.loginFailed = !d, a.$emit("ws.login", d), console.debug("Connected to verto server:", d), angular.isFunction(b) && b(c, d)
                    },
                    onMessage: function(b, c, d, e) {
                        switch (console.debug("onMessage:", b, c, d, e), d) {
                            case $.verto["enum"].message.pvtEvent:
                                if (e.pvtData) switch (e.pvtData.action) {
                                    case "conference-liveArray-join":
                                        e.pvtData.screenShare || e.pvtData.videoOnly || (console.log("conference-liveArray-join"), l(), j(b, c, e.pvtData), updateVideoSize());
                                        break;
                                    case "conference-liveArray-part":
                                        e.pvtData.screenShare || e.pvtData.videoOnly || (console.log("conference-liveArray-part"), l())
                                }
                                break;
                            case $.verto["enum"].message.info:
                                var f = e.body,
                                    g = e.from_msg_name || e.from;
                                if (!f) return void console.log("Received an empty body: ", e);
                                a.$emit("chat.newMessage", {
                                    from: g,
                                    body: f
                                });
                                break;
                            case $.verto["enum"].message.display:
                                a.$apply(function() {});
                                break;
                            case $.verto["enum"].message.clientReady:
                                a.$emit("clientReady", {
                                    reattached_sessions: e.reattached_sessions
                                });
                                break;
                            default:
                                console.warn("Got a not implemented message:", d, c, e)
                        }
                    },
                    onDialogState: function(a) {
                        switch (k.call || (k.call = a), console.debug("onDialogState:", a), a.state.name) {
                            case "ringing":
                                i(a.params.caller_id_number);
                                break;
                            case "trying":
                                console.debug("Calling:", a.cidString()), k.callState = "trying";
                                break;
                            case "early":
                                console.debug("Talking to:", a.cidString()), k.callState = "active", h();
                                break;
                            case "active":
                                console.debug("Talking to:", a.cidString()), k.callState = "active", g(a.lastState.name, a.params), updateVideoSize();
                                break;
                            case "hangup":
                                console.debug("Call ended with cause: " + a.cause), k.callState = "hangup";
                                break;
                            case "destroy":
                                console.debug("Destroying: " + a.cause), a.params.screenShare ? e(n) : (l(), n.reloaded || f());
                                break;
                            default:
                                console.warn("Got a not implemented state:", a)
                        }
                    },
                    onWSClose: function(b, c) {
                        console.debug("onWSClose:", c), a.$emit("ws.close", c)
                    },
                    onEvent: function(a, b) {
                        console.debug("onEvent:", b)
                    }
                },
                n = this;
            k.mediaPerm ? m() : $.FSRTC.checkPerms(m, !0, !0)
        },
        mediaPerm: function(a) {
            $.FSRTC.checkPerms(a, !0, !0)
        },
        login: function(a) {
            k.instance.loginData({
                login: k.login + "@" + k.hostname,
                passwd: k.password
            }), k.instance.login(), angular.isFunction(a) && a(k.instance, !0)
        },
        disconnect: function(a) {
            console.debug("Attempting to disconnect to verto."), k.instance.logout(), k.connected = !1, console.debug("Disconnected from verto server."), angular.isFunction(a) && a(k.instance, k.connected)
        },
        call: function(a, b, c) {
            console.debug("Attempting to call destination " + a + ".");
            var e = k.instance.newCall(angular.extend({
                destination_number: a,
                caller_id_name: k.name,
                caller_id_number: k.callerid ? k.callerid : k.email,
                outgoingBandwidth: d.data.outgoingBandwidth,
                incomingBandwidth: d.data.incomingBandwidth,
                useVideo: d.data.useVideo,
                useStereo: d.data.useStereo,
                useCamera: d.data.selectedVideo,
                useSpeak: d.data.selectedSpeaker,
                useMic: d.data.selectedAudio,
                dedEnc: d.data.useDedenc,
                mirrorInput: d.data.mirrorInput,
                userVariables: {
                    email: d.data.email,
                    avatar: "http://gravatar.com/avatar/" + md5(d.data.email) + ".png?s=600"
                }
            }, c));
            k.call = e, k.mutedMic = !1, k.mutedVideo = !1, angular.isFunction(b) && b(k.instance, e)
        },
        screenshare: function(b, c) {
            var e = this;
            if ("screen" !== d.data.selectedShare) {
                console.log("share screen from device " + d.data.selectedShare);
                var f = k.instance.newCall({
                    destination_number: b + "-screen",
                    caller_id_name: k.name + " (Screen)",
                    caller_id_number: k.login + " (screen)",
                    outgoingBandwidth: d.data.outgoingBandwidth,
                    incomingBandwidth: d.data.incomingBandwidth,
                    useCamera: d.data.selectedShare,
                    useVideo: !0,
                    screenShare: !0,
                    dedEnc: d.data.useDedenc,
                    mirrorInput: d.data.mirrorInput,
                    userVariables: {
                        email: d.data.email,
                        avatar: "http://gravatar.com/avatar/" + md5(d.data.email) + ".png?s=600"
                    }
                });
                return f.rtc.options.callbacks.onStream = function(a, b) {
                    function c() {
                        e.data.shareCall && (e.screenshareHangup(), console.log("screenshare ended"))
                    }
                    if (b) {
                        var d = b.getVideoTracks()[0];
                        d.addEventListener("ended", c)
                    }
                    console.log("screenshare started")
                }, k.shareCall = f, console.log("shareCall", k), k.mutedMic = !1, k.mutedVideo = !1, void e.refreshDevices()
            }
            console.log("share screen from plugin " + d.data.selectedShare);
            var g = function(c, f, g) {
                if (c) return void a.$emit("ScreenShareExtensionStatus", c);
                var h = k.instance.newCall({
                    destination_number: b + "-screen",
                    caller_id_name: k.name + " (Screen)",
                    caller_id_number: k.login + " (Screen)",
                    outgoingBandwidth: d.data.outgoingBandwidth,
                    incomingBandwidth: d.data.incomingBandwidth,
                    videoParams: g ? g.video.mandatory : {},
                    useVideo: !0,
                    screenShare: !0,
                    dedEnc: d.data.useDedenc,
                    mirrorInput: d.data.mirrorInput,
                    userVariables: {
                        email: d.data.email,
                        avatar: "http://gravatar.com/avatar/" + md5(d.data.email) + ".png?s=600"
                    }
                });
                h.rtc.options.callbacks.onStream = function(a, b) {
                    function c() {
                        e.data.shareCall && (e.screenshareHangup(), console.log("screenshare ended"))
                    }
                    if (b) {
                        var d = b.getVideoTracks()[0];
                        d.addEventListener("ended", c)
                    }
                    console.log("screenshare started")
                }, k.shareCall = h, console.log("shareCall", k), k.mutedMic = !1, k.mutedVideo = !1
            };
            navigator.mozGetUserMedia ? g() : getScreenId(g)
        },
        screenshareHangup: function() {
            return k.shareCall ? (console.log("shareCall End", k.shareCall), k.shareCall.hangup(), void console.debug("The screencall was hangup.")) : (console.debug("There is no call to hangup."), !1)
        },
        hangup: function(a) {
            return console.debug("Attempting to hangup the current call."), k.call ? (k.call.hangup(), k.conf && (k.conf.destroy(), k.conf = null), console.debug("The call was hangup."), void(angular.isFunction(a) && a(k.instance, !0))) : (console.debug("There is no call to hangup."), !1)
        },
        dtmf: function(a, b) {
            return console.debug('Attempting to send DTMF "' + a + '".'), k.call ? (k.call.dtmf(a.toString()), console.debug("The DTMF was sent for the call."), void(angular.isFunction(b) && b(k.instance, !0))) : (console.debug("There is no call to send DTMF."), !1)
        },
        testSpeed: function(b) {
            k.instance.rpcClient.speedTest(262144, function(c, e) {
                var f = Math.ceil(.75 * e.upKPS),
                    g = Math.ceil(.75 * e.downKPS);
                d.data.autoBand && (d.data.incomingBandwidth = g, d.data.outgoingBandwidth = f, d.data.useDedenc = !1, d.data.vidQual = "hd", 256 > f ? d.data.vidQual = "qqvga" : 512 > f ? d.data.vidQual = "qvga" : 1024 > f && (d.data.vidQual = "vga")), b && b(e), a.$emit("testSpeed", e)
            })
        },
        muteMic: function(a) {
            return console.debug("Attempting to mute mic for the current call."), k.call ? (k.call.dtmf("0"), k.mutedMic = !k.mutedMic, console.debug("The mic was muted for the call."), void(angular.isFunction(a) && a(k.instance, !0))) : (console.debug("There is no call to mute."), !1)
        },
        muteVideo: function(a) {
            return console.debug("Attempting to mute video for the current call."), k.call ? (k.call.dtmf("*0"), k.mutedVideo = !k.mutedVideo, console.debug("The video was muted for the call."), void(angular.isFunction(a) && a(k.instance, !0))) : (console.debug("There is no call to mute."), !1)
        },
        sendConferenceChat: function(a) {
            k.conf.sendChat(a, "message")
        },
        setCanvasIn: function(a, b) {
            k.conf.modCommand("vid-canvas", a, b)
        },
        setCanvasOut: function(a, b) {
            k.conf.modCommand("vid-watching-canvas", a, b)
        },
        setLayer: function(a, b) {
            k.conf.modCommand("vid-layer", a, b)
        },
        setResevartionId: function(a, b) {
            k.conf.modCommand("vid-res-id", a, b)
        },
        sendMessage: function(a, b) {
            k.call.message({
                to: k.chattingWith,
                body: a,
                from_msg_name: k.name,
                from_msg_number: k.cid
            }), angular.isFunction(b) && b(k.instance, !0)
        }
    }
}]);
var vertoService = angular.module("vertoService");
vertoService.service("config", ["$rootScope", "$http", "$location", "storage", "verto", function(a, b, c, d, e) {
        var f = function() {
            d.data.name && (e.data.name = d.data.name), d.data.email && (e.data.email = d.data.email), d.data.login && (e.data.login = d.data.login), d.data.password && (e.data.password = d.data.password);
            var c = window.location.origin + window.location.pathname,
                f = b.get(c + "config.json?cachebuster=" + Math.floor(1e6 * Math.random() + 1)),
                g = f.then(function(b) {
                    var c = b.data,
                        f = e.data.name,
                        g = e.data.email;
                    return console.debug("googlelogin: " + c.googlelogin), c.googlelogin && (e.data.googlelogin = c.googlelogin, e.data.googleclientid = c.googleclientid), angular.extend(e.data, c), "" != f && "" == c.name && (e.data.name = f), "" != g && "" == c.email && (e.data.email = g), "" == e.data.login && "" == e.data.password && "" != d.data.login && "" != d.data.password && (e.data.login = d.data.login, e.data.password = d.data.password), "true" != e.data.autologin || e.data.autologin_done || (console.debug("auto login per config.json"), e.data.autologin_done = !0), e.data.autologin && d.data.name.length && d.data.email.length && d.data.login.length && d.data.password.length && a.$emit("config.http.success", c), b
                }, function(b) {
                    return a.$emit("config.http.error", b), b
                });
            return g
        };
        return {
            configure: f
        }
    }]), angular.module("vertoService").service("eventQueue", ["$rootScope", "$q", "storage", "verto", function(a, b, c, d) {
        var e = [],
            f = function() {
                var b, c;
                if (b = e.shift(), void 0 == b) return void a.$emit("eventqueue.complete");
                c = b();
                var d = function() {
                    a.$emit("eventqueue.next")
                };
                c.then(function() {
                    d()
                }, function() {
                    d()
                })
            },
            g = function() {
                a.$on("eventqueue.next", function(a) {
                    f()
                }), f()
            };
        return {
            next: f,
            process: g,
            events: e
        }
    }]),
    function() {
        "use strict";
        angular.module("storageService", ["ngStorage"])
    }(), angular.module("storageService").service("storage", ["$rootScope", "$localStorage", function(a, b) {
        function c(a) {
            jQuery.extend(!0, d, a)
        }
        var d = b,
            e = {
                ui_connected: !1,
                ws_connected: !1,
                cur_call: 0,
                called_number: "",
                useVideo: !0,
                call_history: {},
                history_control: [],
                call_start: !1,
                name: window.fsSip.name,
                email: window.fsSip.email,
                login: window.fsSip.username,
                password: window.fsSip.password,
                userStatus: "disconnected",
                mutedVideo: !1,
                mutedMic: !1,
                preview: !0,
                selectedVideo: null,
                selectedVideoName: null,
                selectedAudio: null,
                selectedShare: null,
                selectedSpeaker: null,
                useStereo: !0,
                useSTUN: !0,
                useDedenc: !1,
                mirrorInput: !1,
                outgoingBandwidth: "default",
                incomingBandwidth: "default",
                vidQual: void 0,
                askRecoverCall: !1,
                googNoiseSuppression: !0,
                googHighpassFilter: !0,
                googEchoCancellation: !0,
                googAutoGainControl: !0,
                autoBand: !0,
                testSpeedJoin: !0,
                bestFrameRate: "15",
                language: void 0
            };
        return d.$default(e), {
            data: d,
            changeData: c,
            reset: function() {
                d.ui_connected = !1, d.ws_connected = !1, d.cur_call = 0, d.userStatus = "disconnected"
            },
            factoryReset: function() {
                localStorage.clear(), d.$reset(e)
            }
        }
    }]), angular.module("storageService").factory("CallHistory", ["storage", function(a) {
        var b = a.data.call_history,
            c = a.data.history_control,
            d = function(a, d, e) {
                void 0 == b[a] && (b[a] = []), b[a].unshift({
                    number: a,
                    direction: d,
                    status: e,
                    call_start: Date()
                });
                var f = c.indexOf(a);
                console.log(f), f > -1 && c.splice(f, 1), c.unshift(a)
            },
            e = function(a) {
                return b[a]
            };
        return {
            all: function() {
                return b
            },
            all_control: function() {
                return c
            },
            get: function(a) {
                return e(a)
            },
            add: function(a, b, c) {
                return d(a, b, c)
            },
            clear: function() {
                return a.data.call_history = {}, a.data.history_control = [], b = a.data.call_history, c = a.data.history_control
            }
        }
    }]), angular.module("storageService").service("splashscreen", ["$rootScope", "$q", "storage", "config", "verto", "$translate", function(a, b, c, d, e, f) {
        var g = function() {
                return b(function(a, b) {
                    var c = "browser-upgrade",
                        d = {
                            activity: c,
                            soft: !1,
                            status: "success",
                            message: f.instant("BROWSER_COMPATIBILITY")
                        };
                    navigator.mediaDevices.getUserMedia || (d.status = "error", d.message = f.instant("BROWSER_WITHOUT_WEBRTC"), b(d)), a(d)
                })
            },
            h = function() {
                return b(function(a, b) {
                    var c = "media-perm",
                        d = {
                            activity: c,
                            soft: !1,
                            status: "success",
                            message: f.instant("CHECK_PERMISSION_MEDIA")
                        };
                    e.mediaPerm(function(c) {
                        c || (d.status = "error", d.message = f.instant("ERROR_PERMISSION_MEDIA"), e.data.mediaPerm = !1, b(d)), e.data.mediaPerm = !0, a(d)
                    })
                })
            },
            i = function() {
                return b(function(a, b) {
                    var c = "refresh-devices",
                        d = {
                            status: "success",
                            soft: !0,
                            activity: c,
                            message: f.instant("REFRESH_MEDIA_DEVICES")
                        };
                    e.refreshDevices(function(b) {
                        e.refreshDevicesCallback(function() {
                            a(d)
                        })
                    })
                })
            },
            j = function() {
                return b(function(a, b) {
                    function d(b) {
                        a(h)
                    }
                    var g = "check-connection-speed",
                        h = {
                            status: "success",
                            soft: !0,
                            activity: g,
                            message: f.instant("CHECK_CONNECTION_SPEED")
                        };
                    c.data.autoBand && e.data.instance ? e.testSpeed(d) : a(h)
                })
            },
            k = function() {
                return b(function(a, b) {
                    var c = "provision-config",
                        e = {
                            status: "promise",
                            soft: !0,
                            activity: c,
                            message: f.instant("CHECK_PROVISIONING_CONF")
                        },
                        g = d.configure(),
                        h = g.then(function(a) {
                            return a.status >= 200 && a.status <= 299 ? e : (e.status = "error", e.message = f.instant("ERROR_PROVISIONING_CONF"), e)
                        });
                    e.promise = h, a(e)
                })
            },
            l = function() {
                return b(function(a, b) {
                    var d = "check-login",
                        g = {
                            status: "success",
                            soft: !0,
                            activity: d,
                            message: f.instant("CHECK_LOGIN")
                        };
                    if (e.data.connecting || e.data.connected) return void a(g);
                    var h = function() {
                        c.data.ui_connected && c.data.ws_connected && !e.data.connecting && (e.data.hostname = c.data.hostname || e.data.hostname, e.data.wsURL = c.data.wsURL || e.data.wsURL, e.data.name = c.data.name, e.data.email = c.data.email, e.data.login = c.data.login, e.data.password = c.data.password, e.data.connecting = !0, e.connect(function(b, c) {
                            e.data.connecting = !1, a(g)
                        }))
                    };
                    c.data.ui_connected && c.data.ws_connected ? h() : a(g)
                })
            },
            m = [g, h, i, k, l, j],
            n = [f.instant("BROWSER_COMPATIBILITY"), f.instant("CHECK_PERMISSION_MEDIA"), f.instant("REFRESH_MEDIA_DEVICES"), f.instant("CHECK_PROVISIONING_CONF"), f.instant("CHECK_LOGIN"), f.instant("CHECK_CONNECTION_SPEED")],
            o = function(a) {
                return void 0 != n[a] ? n[a] : f.instant("PLEASE_WAIT")
            },
            p = -1,
            q = 0,
            r = function(a) {
                var b;
                return b = a + 1, q = b / m.length * 100
            },
            s = function() {
                var b, c, d, e, f, g, h, i;
                if (e = !1, p++, p >= m.length) return void a.$emit("progress.complete", p);
                b = m[p], c = b();
                var j = function(b) {
                    void 0 != b.promise && (i = b.promise), d = b.status, g = b.soft, f = b.activity, h = b.message, "success" != d && (e = !0), a.$emit("progress.next", p, d, i, f, g, e, h)
                };
                c.then(function(a) {
                    j(a)
                }, function(a) {
                    j(a)
                })
            };
        return {
            next: s,
            getProgressMessage: o,
            progress_percentage: q,
            calculate: r
        }
    }]);
//# sourceMappingURL=scripts.eb8d8230.js.map