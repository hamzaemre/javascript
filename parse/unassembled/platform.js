/* ---------------------------------------------------------------------------
 WAIT! - This file depends on instructions from the PUBNUB Cloud.
 http://www.pubnub.com/account
 --------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 PubNub Real-time Cloud-Hosted Push API and Push Notification Client Frameworks
 Copyright (c) 2011 TopMambo Inc.
 http://www.pubnub.com/
 http://www.pubnub.com/terms
 --------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 --------------------------------------------------------------------------- */
/**
 * UTIL LOCALS
 */
var crypto = require('crypto'),
    Buffer = require('buffer').Buffer,
    PNSDK = 'PubNub-JS-' + PLATFORM + '/' +  VERSION;

function get_hmac_SHA256(data, key) {
    return crypto.createHmac('sha256',
        new Buffer(key, 'utf8')).update(data).digest('base64');
}

/**
 * ERROR
 * ===
 * error('message');
 */
function error(message) {
    console.error(message);
}

/**
 * Request
 * =======
 *  xdr({
 *     url     : ['http://www.blah.com/url'],
 *     success : function(response) {},
 *     fail    : function() {}
 *  });
 */
function xdr(setup) {
    var success = setup.success || function () {
            },
        fail = setup.fail || function () {
            },
        mode = setup.mode || 'GET',
        data = setup.data || {},
        options = {},
        payload,
        origin,
        url;

    data.pnsdk = PNSDK;

    if (mode == 'POST') {
        payload = decodeURIComponent(setup.url.pop());
    }

    url = build_url(setup.url, data);
    url = '/' + url.split('/').slice(3).join('/');

    origin = setup.url[0].split("//")[1];

    options.url = "http://" + origin + url;
    options.method = mode;
    options.body = payload;

    function invokeFail(message, payload) {
        fail({
            message: message,
            payload: payload
        })
    }

    Parse.Cloud.httpRequest(options)
        .then(function (httpResponse) {
            var result;

            try {
                result = JSON.parse(httpResponse.text);
            } catch (e) {
                invokeFail("Bad JSON response", httpResponse.text);
                return;
            }

            success(result);
        }, function (httpResponse) {
            var response;

            try {
                response = JSON.parse(httpResponse.text);

                if (typeof response === 'object' && 'error' in response && response.error === true) {
                    fail(response);
                } else {
                    invokeFail("Network error", httpResponse.text)
                }
            } catch (e) {
                invokeFail("Network error", httpResponse.text);
            }
        });
}

/**
 * LOCAL STORAGE
 */
var db = (function () {
    var store = {};

    return {
        'get': function (key) {
            return store[key];
        },
        'set': function (key, value) {
            store[key] = value;
        }
    };
})();

function crypto_obj() {
    var iv = "0123456789012345";

    function get_padded_key(key) {
        return crypto.createHash('sha256').update(key).digest("hex").slice(0, 32);
    }

    return {
        'encrypt': function (input, key) {
            if (!key) return input;
            var plain_text = JSON['stringify'](input);
            var cipher = crypto.createCipheriv('aes-256-cbc', get_padded_key(key), iv);
            var base_64_encrypted = cipher.update(plain_text, 'utf8', 'base64') + cipher.final('base64');
            return base_64_encrypted || input;
        },
        'decrypt': function (input, key) {
            if (!key) return input;
            var decipher = crypto.createDecipheriv('aes-256-cbc', get_padded_key(key), iv);
            try {
                var decrypted = decipher.update(input, 'base64', 'utf8') + decipher.final('utf8');
            } catch (e) {
                return null;
            }
            return JSON.parse(decrypted);
        }
    }
}

var CREATE_PUBNUB = function (setup) {
    setup['xdr'] = xdr;
    setup['db'] = db;
    setup['error'] = setup['error'] || error;
    setup['hmac_SHA256'] = get_hmac_SHA256;
    setup['crypto_obj'] = crypto_obj();
    setup['params'] = {'pnsdk': PNSDK};

    var SELF = function (setup) {
        return CREATE_PUBNUB(setup);
    };

    var PN = PN_API(setup);

    for (var prop in PN) {
        if (PN.hasOwnProperty(prop)) {
            SELF[prop] = PN[prop];
        }
    }

    SELF.init = SELF;
    SELF.secure = SELF;

    SELF.subscribe = function () {
        throw Error("#subscribe() method is disabled in Parse.com environment")
    };

    SELF.ready();

    return SELF;
};

function setTimeout() {
    // stub
}

function clearTimeout() {
    // stub
}

CREATE_PUBNUB.init = CREATE_PUBNUB;
CREATE_PUBNUB.unique = unique;
CREATE_PUBNUB.secure = CREATE_PUBNUB;
module.exports = CREATE_PUBNUB;
module.exports.PNmessage = PNmessage;