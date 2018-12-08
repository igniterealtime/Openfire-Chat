/**
 * RAYO : XMPP -0327 plugin for Strophe
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Strophe.addConnectionPlugin('rayo',
{
    _connection: null,

    init: function(conn)
    {
        this.callbacks = {};
        this._connection = conn;

        Strophe.addNamespace('RAYO_CORE', "urn:xmpp:rayo:1");
        Strophe.addNamespace('RAYO_CALL', "urn:xmpp:rayo:call:1");
        Strophe.addNamespace('RAYO_MIXER', "urn:xmpp:rayo:mixer:1");
        Strophe.addNamespace('RAYO_EXT', "urn:xmpp:rayo:ext:1");
        Strophe.addNamespace('RAYO_EXT_COMPLETE', "urn:xmpp:rayo:ext:complete:1");
        Strophe.addNamespace('RAYO_INPUT', "urn:xmpp:rayo:input:1");
        Strophe.addNamespace('RAYO_INPUT_COMPLETE', "urn:xmpp:rayo:input:complete:1");
        Strophe.addNamespace('RAYO_OUTPUT', "urn:xmpp:rayo:output:1");
        Strophe.addNamespace('RAYO_OUTPUT_COMPLETE', "urn:xmpp:rayo:output:complete:1");
        Strophe.addNamespace('RAYO_PROMPT', "urn:xmpp:rayo:prompt:1");
        Strophe.addNamespace('RAYO_RECORD', "urn:xmpp:rayo:record:1");
        Strophe.addNamespace('RAYO_RECORD_COMPLETE', "urn:xmpp:rayo:record:complete:1");
        Strophe.addNamespace('RAYO_SAY', "urn:xmpp:tropo:say:1");
        Strophe.addNamespace('RAYO_SAY_COMPLETE', "urn:xmpp:tropo:say:complete:1");
        Strophe.addNamespace('RAYO_HANDSET', "urn:xmpp:rayo:handset:1");
        Strophe.addNamespace('RAYO_HANDSET_COMPLETE', "urn:xmpp:rayo:handset:complete:1");

        this._connection.addHandler(this._handlePresence.bind(this), null,"presence", null, null, null);

        console.log('Rayo plugin initialised', conn);
    },

    phone: function(callbacks)
    {
        this.callbacks = callbacks;
    },

    hangup: function(callId)
    {
        console.log("hangup " + callId);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("hangup", {xmlns: Strophe.NS.RAYO_CORE});

        console.log(iq.toString());

        that._connection.sendIQ(iq, function()
        {
            that._onhook();

        }, function(error) {

            that._onhook();

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("hangup failure " + errorcode);
            });
        });
    },

    digit: function(callId, key)
    {
        console.log("Rayo plugin digit " + callId + " " + key);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("dtmf", {xmlns: Strophe.NS.RAYO_CORE, tones: key});

        that._connection.sendIQ(iq, null, function(error)
        {
            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("dtmf failure " + errorcode);
            });
        });
    },

    join: function(mixer, headers)
    {
        console.log('Rayo plugin join ' + mixer);
        console.log(headers)

        if (this._isOffhook()) this._onhook();

        var that = this;

        this._offhook(mixer, headers, function()
        {
            var iq = $iq({to: mixer + "@" + that._connection.domain, from: that._connection.jid, type: "get"}).c("join", {xmlns: Strophe.NS.RAYO_CORE, "mixer-name": mixer});

            console.log(iq.toString());

            that._connection.sendIQ(iq, null, function(error)
            {
                $('error', error).each(function()
                {
                    var errorcode = $(this).attr('code');
                    if (that.callbacks && that.callbacks.onError) that.callbacks.onError("join failure " + errorcode);
                });
            });
        });
    },

    leave: function(mixer)
    {
        console.log('Rayo plugin leave ' + mixer);

        var that = this;
        var iq = $iq({to: mixer + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("unjoin", {xmlns: Strophe.NS.RAYO_CORE, "mixer-name": mixer});

        console.log(iq.toString());

        that._connection.sendIQ(iq, function(response)
        {
            that._onhook();

        }, function(error) {

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("unjoin failure " + errorcode);
            });
        });
    },

    hold: function(callId)
    {
        console.log("hold " + callId);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("hold", {xmlns: Strophe.NS.RAYO_HANDSET});

        console.log(iq.toString());

        that._connection.sendIQ(iq, function()
        {
            that._onhook();

        }, function(error) {

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("hold failure " + errorcode);
            });
        });
    },

    redirect: function(callId, to, headers)
    {
        console.log("redirect " + callId, to);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("redirect", {xmlns: Strophe.NS.RAYO_CORE, to: to});

        if (headers)
        {
            var hdrs = Object.getOwnPropertyNames(headers)

            for (var i=0; i< hdrs.length; i++)
            {
                var name = hdrs[i];
                var value = headers[name];

                if (value) iq.c("header", {name: name, value: value}).up();
            }
        }

        console.log(iq.toString());

        that._connection.sendIQ(iq, function(response)
        {
            $('ref', response).each(function()
            {
                callId = $(this).attr('id');

                if (that._isOffhook()) that._onhook();
                if (that.callbacks && that.callbacks.onRedirect) that.callbacks.onRedirect(callId);
            });

        }, function(error) {

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("redirect failure " + errorcode);
            });
        });
    },

    say: function(callId, message)
    {
        console.log('Rayo plugin say ' + callId + " " + message);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c( "say", {xmlns: Strophe.NS.RAYO_SAY}).t(message);

        that._connection.sendIQ(iq, function(response)
        {
            $('ref', response).each(function()
            {
                var sayId = $(this).attr('id');
                var node = Strophe.escapeNode(callId + "@" + that._connection.domain + "/" + sayId);

                if (that.callbacks && that.callbacks.onSay) that.callbacks.onSay(
                {
                    sayId: sayId,

                    pause: function()
                    {
                        that._connection.sendIQ($iq({to: node + "@" + that._connection.domain, from: that._connection.jid, type: "get"}).c( "pause", {xmlns: Strophe.NS.RAYO_SAY}), function(response){}, null, function(error){

                            $('error', error).each(function()
                            {
                                var errorcode = $(this).attr('code');
                                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("pause failure " + errorcode);
                            });
                        });
                    },

                    resume: function()
                    {
                        that._connection.sendIQ($iq({to: node + "@" + that._connection.domain, from: that._connection.jid, type: "get"}).c( "resume", {xmlns: Strophe.NS.RAYO_SAY}), null, function(error){

                            $('error', error).each(function()
                            {
                                var errorcode = $(this).attr('code');
                                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("resume failure " + errorcode);
                            });

                        });
                    }
                });
            });

        }, function(error) {

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("say failure " + errorcode);
            });
        });

    },

    record: function(callId, fileName)
    {
        var to = "file:" + fileName + ".au";
        console.log('Rayo plugin record ' + callId + " " + to);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("record", {xmlns: Strophe.NS.RAYO_RECORD, to: to});

        that._connection.sendIQ(iq, null, function(error)
        {
            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("record failure " + errorcode);
            });
        });

    },

    private: function(callId, flag)
    {
        console.log('Rayo plugin private ' + callId + " " + flag);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c( flag ? "private" : "public", {xmlns: Strophe.NS.RAYO_HANDSET});

        that._connection.sendIQ(iq, null, function(error)
        {
            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("private/public failure " + errorcode);
            });
        });

    },

    mute: function(callId, flag)
    {
        console.log('Rayo plugin mute ' + callId + " " + flag);

        var that = this;
        var iq = $iq({to: callId + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c( flag ? "mute" : "unmute", {xmlns: Strophe.NS.RAYO_HANDSET});

        that._connection.sendIQ(iq, null, function(error)
        {
            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("mute/unmute failure " + errorcode);
            });
        });

    },

    answer: function(callId, mixer, headers, callFrom)
    {
        console.log('Rayo plugin accept ' + callId + " " + mixer);

        var that = this;

        if (this._isOffhook()) this._onhook();
        if (!headers) headers = {};

        headers.call_id = callId;

        console.log(headers)

        this._offhook(mixer, headers, function()
        {
            var iq = $iq({to: callId + "@" + that._connection.domain, from: that._connection.jid, type: "get"}).c("answer", {xmlns: Strophe.NS.RAYO_CORE});

            var hdrs = Object.getOwnPropertyNames(headers)

            for (var i=0; i< hdrs.length; i++)
            {
                var name = hdrs[i];
                var value = headers[name];

                if (value) iq.c("header", {name: name, value: value}).up();
            }


            iq.c("header", {name: "caller_id", value: callFrom}).up();
            iq.c("header", {name: "mixer_name", value: mixer}).up();

            console.log(iq.toString());

            that._connection.sendIQ(iq, null, function(error)
            {
                $('error', error).each(function()
                {
                    var errorcode = $(this).attr('code');
                    if (that._isOffhook()) that._onhook();
                    if (that.callbacks && that.callbacks.onError) that.callbacks.onError("answer failure " + errorcode);
                });
            });
        });
    },

    dial: function(from, to, headers)
    {
        console.log('Rayo plugin dial ' + from + " " + to);
        console.log(headers)

        var that = this;

        var mixer = "rayo-outgoing-" + Math.random().toString(36).substr(2,9);

        if (this._isOffhook()) this._onhook();

        this._offhook(mixer, headers, function()
        {
            that._dial(mixer, from, to, headers);
        });
    },

    voicebridge: function(mixer, from, to, headers)
    {
        console.log('Rayo plugin voicebridge ' + mixer);

        var that = this;

        var iq = $iq({to: mixer + "@" + this._connection.domain, from: this._connection.jid, type: "get"}).c("join", {xmlns: Strophe.NS.RAYO_CORE, "mixer-name": mixer});

        console.log(iq.toString());

        this._connection.sendIQ(iq, function(response)
        {
            that._dial(mixer, from, to, headers);

        }, function(error) {

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("voicebridge failure " + errorcode);
            });
        });
    },

    _dial: function(mixer, from, to, headers)
    {
        console.log('Rayo plugin _dial ' + from + " " + to);
        console.log(headers)

        var that = this;

        var iq = $iq({to: that._connection.domain, from: that._connection.jid, type: "get"}).c("dial", {xmlns: Strophe.NS.RAYO_CORE, to: to, from: from});

        if (headers)
        {
            var hdrs = Object.getOwnPropertyNames(headers)

            for (var i=0; i< hdrs.length; i++)
            {
                var name = hdrs[i];
                var value = headers[name];

                if (value) iq.c("header", {name: name, value: value}).up();
            }
        }

        console.log(iq.toString());

        that._connection.sendIQ(iq, function(response) {

            $('ref', response).each(function()
            {
                callId = $(this).attr('id');

                if (that.callbacks && that.callbacks.onAccept)
                {
                    that.callbacks.onAccept(
                    {
                        digit:    function(tone)    {that.digit(callId, tone);},
                        redirect: function(to)      {that.redirect(callId, to, headers);},
                        say:      function(message) {that.say(callId, message);},
                        record:   function(file)    {that.record(callId, file);},
                        hangup:   function()        {that.hangup(callId);},
                        hold:     function()        {that.hold(callId);},
                        join:     function()        {that.join(mixer, headers);},
                        leave:    function()        {that.leave(mixer);},
                        mute:     function(flag)    {that.mute(callId, flag);},
                        private:  function()        {that.private(callId, !this.privateCall);},

                        from:   from,
                        to: to,
                        id: callId,
                        privateCall: false
                    });
                }
            });

        }, function(error){

            console.log(error);

            $('error', error).each(function()
            {
                var errorcode = $(this).attr('code');
                if (that._isOffhook()) that._onhook();
                if (that.callbacks && that.callbacks.onError) that.callbacks.onError("dial failure " + errorcode);
            });

            that._onhook();
        });
    },

    _isOffhook: function()
    {
        return this.localStream != null;
    },

    _offhook: function(mixer, headers, action)
    {
        console.log('Rayo plugin offhook ' + mixer);
        if (action) action();
    },

    _offhook1: function(mixer, headers, action)
    {
        console.log('Rayo plugin _offhook1 ' + mixer);
        if (action) action();
    },

    _offhook2: function(mixer, headers, action)
    {
        console.log('Rayo plugin _offhook2 ' + this.cryptoSuite + " " + this.localCrypto + " " + this.remoteCrypto + " " + mixer);
        if (action) action();
    },

    _onhook: function()
    {
        console.log('Rayo plugin onhook ' + this.handsetId);
    },


    _handlePresence: function(presence)
    {
        console.log('Rayo plugin handlePresence');
        console.log(presence);

        var that = this;
        var from = $(presence).attr('from');
        var headers = {}

        $(presence).find('header').each(function()
        {
            var name = $(this).attr('name');
            var value = $(this).attr('value');

            headers[name] = value;
        });


        $(presence).find('complete').each(function()
        {
            $(this).find('success').each(function()
            {
                if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET_COMPLETE)
                {
                    that._onhook();
                }

                if ($(this).attr('xmlns') == Strophe.NS.RAYO_SAY_COMPLETE)
                {
                    var sayId = Strophe.getResourceFromJid(from);
                    if (that.callbacks && that.callbacks.onSayComplete) that.callbacks.onSayComplete(sayId);
                }
            });
        });

        $(presence).find('offer').each(function()
        {
            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callFrom = $(this).attr('from');
                var callTo = $(this).attr('to');
                var callId = Strophe.getNodeFromJid(from);

                var mixer = headers.mixer_name;

                var call = {
                    digit:    function(tone)    {that.digit(callId, tone);},
                    redirect: function(to)      {that.redirect(callId, to, headers);},
                    say:      function(message) {that.say(callId, message);},
                    record:   function(file)    {that.record(callId, file);},
                    hangup:   function()        {that.hangup(callId);},
                    hold:     function()        {that.hold(callId);},
                    answer:   function()        {that.answer(callId, mixer, headers, callFrom);},
                    join:     function()        {that.join(mixer, headers);},
                    leave:    function()        {that.leave(mixer);},
                    mute:     function(flag)    {that.mute(callId, flag);},
                    private:  function()        {that.private(callId, !this.privateCall);},

                    from:   callFrom,
                    to: callTo,
                    id: callId,
                    privateCall: false
                }

                if (that.callbacks && that.callbacks.onOffer) that.callbacks.onOffer(call, headers);

                var iq = $iq({to: from, from: that._connection.jid, type: "get"}).c("accept", {xmlns: Strophe.NS.RAYO_CORE});

                var hdrs = Object.getOwnPropertyNames(headers)

                for (var i=0; i< hdrs.length; i++)
                {
                    var name = hdrs[i];
                    var value = headers[name];

                    if (value) iq.c("header", {name: name, value: value}).up();
                }

                iq.c("header", {name: "caller_id", value: callFrom}).up();
                iq.c("header", {name: "mixer_name", value: mixer}).up();

                console.log(iq.toString());

                that._connection.sendIQ(iq, null, function(error)
                {
                    $('error', error).each(function()
                    {
                        var errorcode = $(this).attr('code');
                        if (that.callbacks && that.callbacks.onError) that.callbacks.onError("accept failure " + errorcode);
                    });
                });
            }
        })

        $(presence).find('joined').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                var jid = Strophe.unescapeNode(callId);
                var mixer = $(this).attr('mixer-name');

                if (jid == that._connection.jid)
                {
                    if (that.callbacks && that.callbacks.offHook) that.callbacks.offHook();
                }

                if (that.callbacks && that.callbacks.onJoin) that.callbacks.onJoin(callId, jid, mixer);
            }
        });

        $(presence).find('unjoined').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                var jid = Strophe.unescapeNode(callId);
                var mixer = $(this).attr('mixer-name');

                if (jid == that._connection.jid)
                {
                    if (that.callbacks && that.callbacks.onHook) that.callbacks.onHook();
                }

                if (that.callbacks && that.callbacks.onUnjoin) that.callbacks.onUnjoin(callId, jid, mixer);
            }
        });

        $(presence).find('started-speaking').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onSpeaking) that.callbacks.onSpeaking(callId, headers);
            }
        });

        $(presence).find('stopped-speaking').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.offSpeaking) that.callbacks.offSpeaking(callId, headers);
            }
        });

        $(presence).find('onhold').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onHold) that.callbacks.onHold(callId);
            }
        });

        $(presence).find('onmute').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onMute) that.callbacks.onMute(callId);
            }
        });

        $(presence).find('offmute').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.offMute) that.callbacks.offMute(callId);
            }
        });

        $(presence).find('private').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onPrivate) that.callbacks.onPrivate(callId);
            }
        });

        $(presence).find('public').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.offPrivate) that.callbacks.offPrivate(callId);
            }
        });

        $(presence).find('ringing').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onRing) that.callbacks.onRing(callId, headers);
            }
        });

        $(presence).find('transferring').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onRedirecting) that.callbacks.onRedirecting(callId);
            }
        });

        $(presence).find('transferred').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET)
            {
                var callId = Strophe.getNodeFromJid(from);
                if (that.callbacks && that.callbacks.onRedirected) that.callbacks.onRedirected(callId);
            }
        });

        $(presence).find('answered').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                var jid = Strophe.unescapeNode(headers.call_owner);

                var busy = false;

                if (jid.indexOf('@') > -1 && jid.indexOf('/') > -1)
                {
                    if (headers.call_action == "join")
                    {
                        busy = jid != that._connection.jid;

                    } else {

                        busy = jid == that._connection.jid;
                    }
                }


                if (busy)
                {
                    var mixer = headers.mixer_name;

                    var call = {
                        digit:   function(tone)     {that.digit(callId, tone);},
                        say:     function(message)  {that.say(callId, message);},
                        record:  function(file)     {that.record(callId, file);},
                        hangup:  function()         {that.hangup(callId);},
                        hold:    function()         {that.hold(callId);},
                        join:    function()         {that.join(mixer, headers);},
                        leave:   function()         {that.leave(mixer);},
                        mute:    function(flag)     {that.mute(callId, flag);},
                        private: function()         {that.private(callId, !this.privateCall);},

                        id: callId,
                        from:   Strophe.getNodeFromJid(jid),
                        privateCall: false
                    }
                    if (that.callbacks && that.callbacks.onHook) that.callbacks.onHook();
                    if (that.callbacks && that.callbacks.onBusy) that.callbacks.onBusy(call, headers);

                } else {

                    if (that.callbacks && that.callbacks.offHook) that.callbacks.offHook();
                    if (that.callbacks && that.callbacks.onAnswer) that.callbacks.onAnswer(callId, headers);
                }
            }
        });

        $(presence).find('end').each(function()
        {
            console.log(presence);

            if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
            {
                var callId = Strophe.getNodeFromJid(from);
                that._onhook();

                if (that.callbacks && that.callbacks.onHook) that.callbacks.onHook();
                if (that.callbacks && that.callbacks.onEnd) that.callbacks.onEnd(callId, headers);
            }
        });

        return true;
    }
});