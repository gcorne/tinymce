
/* file:jscripts/tiny_mce/classes/tinymce.js */

var tinymce = {
	majorVersion : '3',
	minorVersion : '0a1',
	releaseDate : '2007-11-01',

	init : function() {
		var t = this, ua = navigator.userAgent, i, nl = document.getElementsByTagName('script'), n;

		// Browser checks
		t.isOpera = window.opera && opera.buildNumber;
		t.isWebKit = /WebKit/.test(ua);
		t.isOldWebKit = t.isWebKit && !window.getSelection().getRangeAt;
		t.isIE = !t.isWebKit && !t.isOpera && (/MSIE/gi).test(ua) && (/Explorer/gi).test(navigator.appName);
		t.isIE6 = t.isIE && /MSIE [56]/.test(ua);
		t.isGecko = !t.isWebKit && /Gecko/.test(ua);
		t.isMac = ua.indexOf('Mac') != -1;
		t.suffix = '';

		for (i=0; i<nl.length; i++) {
			n = nl[i];

			if (n.src && n.src.indexOf('tiny_mce') != -1) {
				if (/_(src|dev)\.js/g.test(n.src))
					t.suffix = '_src';

				return t.baseURL = n.src.substring(0, n.src.lastIndexOf('/'));
			}
		}

		n = document.getElementsByTagName('head')[0];
		if (n) {
			nl = n.getElementsByTagName('script');
			for (i=0; i<nl.length; i++) {
				n = nl[i];

				if (n.src && n.src.indexOf('tiny_mce') != -1) {
					if (/_(src|dev)\.js/g.test(n.src))
						t.suffix = '_src';

					return t.baseURL = n.src.substring(0, n.src.lastIndexOf('/'));
				}
			}
		}

		return null;
	},

	is : function(o, t) {
		o = typeof(o);

		if (!t)
			return o != 'undefined';

		return o == t;
	},

	each : function(o, cb, s) {
		var n, l;

		if (!o)
			return 0;

		s = s || o;

		if (typeof(o.length) != 'undefined') {
			// Indexed arrays, needed for Safari
			for (n=0, l = o.length; n<l; n++) {
				if (cb.call(s, o[n], n, o) === false)
					return 0;
			}
		} else {
			// Hashtables
			for (n in o) {
				if (o.hasOwnProperty(n)) {
					if (cb.call(s, o[n], n, o) === false)
						return 0;
				}
			}
		}

		return 1;
	},

	map : function(a, f) {
		var o = [];

		tinymce.each(a, function(v) {
			o.push(f(v));
		});

		return o;
	},

	filter : function(a, f) {
		var o = [];

		tinymce.each(a, function(v) {
			if (!f || f(v))
				o.push(v);
		});

		return o;
	},

	indexOf : function(a, v) {
		var x = -1;

		tinymce.each(a, function(c, i) {
			if (c === v) {
				x = i;
				return false;
			}
		});

		return x;
	},

	extend : function(o, e) {
		tinymce.each(e, function(v, n) {
			if (typeof(v) !== 'undefined')
				o[n] = v;
		});

		return o;
	},

	trim : function(s) {
		return ('' + s).replace(/^\s*|\s*$/g, '');
	},

	create : function(s, p) {
		var t = this, sp, ns, cn, scn, c, de = 0;

		// Parse : <prefix> <class>:<super class>
		s = /^((static) )?([\w.]+)(:([\w.]+))?/.exec(s);
		cn = s[3].match(/(^|\.)(\w+)$/i)[2]; // Class name

		// Create namespace for new class
		ns = t.createNS(s[3].replace(/\.\w+$/, ''));

		// Make pure static class
		if (s[2] == 'static') {
			ns[cn] = p;
			return;
		}

		// Create default constructor
		if (!p[cn]) {
			p[cn] = function() {};
			de = 1;
		}

		// Add constructor and methods
		ns[cn] = p[cn];
		t.extend(ns[cn].prototype, p);

		// Add static methods
		t.each(p['static'], function(f, n) {
			ns[cn][n] = f;
		});

		// Extend
		if (s[5]) {
			sp = t.get(s[5]).prototype;
			scn = s[5].match(/\.(\w+)$/i)[1]; // Class name

			// Extend constructor
			c = ns[cn];
			if (de) {
				// Add passthrough constructor
				ns[cn] = function() {
					return sp[scn].apply(this, arguments);
				};
			} else {
				// Add inherit constructor
				ns[cn] = function() {
					this.parent = sp[scn];
					return c.apply(this, arguments);
				};
			}
			ns[cn].prototype[cn] = ns[cn];

			// Add super methods
			t.each(sp, function(f, n) {
				if (n != scn)
					ns[cn].prototype[n] = sp[n];
			});

			// Add overridden methods
			t.each(p, function(f, n) {
				// Extend methods if needed
				if (sp[n]) {
					ns[cn].prototype[n] = function() {
						this.parent = sp[n];
						return f.apply(this, arguments);
					};
				} else {
					if (n != cn)
						ns[cn].prototype[n] = f;
				}
			});
		}
	},

	walk : function(o, n, f, s) {
		s = s || this;

		if (o && (o = o[n])) {
			tinymce.each(o, function(o, i) {
				if (f.call(s, o, i, n) === false)
					return false;

				tinymce.walk(o, n, f, s);
			});
		}
	},

	createNS : function(n, o) {
		var i, v;

		o = o || window;

		n = n.split('.');
		for (i=0; i<n.length; i++) {
			v = n[i];

			if (!o[v])
				o[v] = {};

			o = o[v];
		}

		return o;
	},

	get : function(n, o) {
		var i, l;

		o = o || window;

		n = n.split('.');
		for (i=0, l = n.length; i<l; i++) {
			o = o[n[i]];

			if (!o)
				break;
		}

		return o;
	},

	addUnload : function(f, s) {
		var t = this, w = window, unload;

		f = {func : f, scope : s || this};

		if (!t.unloads) {
			unload = function() {
				var li = t.unloads, o, n;

				// Call unload handlers
				for (n in li) {
					o = li[n];

					if (o && o.func)
						o.func.call(o.scope);
				}

				// Detach unload function
				if (w.detachEvent)
					w.detachEvent('onunload', unload);
				else if (w.removeEventListener)
					w.removeEventListener('unload', unload, false);

				// Destroy references
				tinymce = o = li = w = unload = null;

				// Run garbarge collector on IE
				if (window.CollectGarbage)
					window.CollectGarbage();
			};

			// Attach unload handler
			if (w.attachEvent)
				w.attachEvent('onunload', unload);
			else if (w.addEventListener)
				w.addEventListener('unload', unload, false);

			// Setup initial unload handler array
			t.unloads = [f];
		} else
			t.unloads.push(f);

		return f;
	},

	removeUnload : function(f) {
		var u = this.unloads, r = null;

		tinymce.each(u, function(o, i) {
			if (o && o.func == f) {
				u.splice(i, 1);
				r = f;
				return false;
			}
		});

		return r;
	}
};

// Initialize the API
tinymce.init();

/* file:jscripts/tiny_mce/classes/util/Dispatcher.js */

(function() {
	// Shorten names
	var each = tinymce.each;

	tinymce.create('tinymce.util.Dispatcher', {
		scope : null,
		listeners : null,

		Dispatcher : function(s) {
			this.scope = s || this;
			this.listeners = [];
		},

		add : function(cb, s) {
			this.listeners.push({cb : cb, scope : s || this.scope});

			return cb;
		},

		unshift : function(cb, s) {
			this.listeners.unshift({cb : cb, scope : s || this.scope});

			return cb;
		},

		remove : function(cb) {
			var l = this.listeners;

			each(l, function(c, i) {
				if (cb == c.cb) {
					l.splice(i, 1);
					return false;
				}
			});

			return cb;
		},

		dispatch : function() {
			var s, a = arguments;

			each(this.listeners, function(c) {
				return s = c.cb.apply(c.scope, a);
			});

			return s;
		}
	});
})();

/* file:jscripts/tiny_mce/classes/util/URI.js */

(function() {
	var each = tinymce.each;

	tinymce.create('tinymce.util.URI', {
		URI : function(u, s) {
			var t = this, o, a;

			// Default settings
			s = t.settings = s || {};
			s.base_uri = s.base_uri || document.location.href;

			// Strange app protocol
			if (/^(mailto|news|javascript|about):/i.test(u)) {
				t.source = u;
				return;
			}

			// Relative URL not //host/dir/file or http://host/dir/file
			if (u.indexOf('://') == -1 && u.indexOf('//') !== 0) {
				o = new tinymce.util.URI(s.base_uri, {base_uri : s.base_uri});
				o.setPath(u);
				return o;
			}

			// Parse URL (Credits goes to Steave, http://blog.stevenlevithan.com/archives/parseuri)
			u = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(u);
			each(["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"], function(v, i) {
				t[v] = u[i];
			});

			t.path = t.path || '/';
		},

		setPath : function(p) {
			var t = this;

			if (p.indexOf('../') != -1 || p.indexOf('/') !== 0)
				p = t.toAbsPath(t.getBaseURI().directory, p);

			p = /^(.*?)\/?(\w+)?$/.exec(p);

			// Update path parts
			t.path = p[0];
			t.directory = p[1];
			t.file = p[2];

			// Rebuild source
			t.source = '';
			t.getURI();
		},

		getBaseURI : function() {
			return new tinymce.util.URI(this.settings.base_uri);
		},

		toRelative : function(u) {
			var t = this;

			u = new tinymce.util.URI(u, {base_uri : t.getURI()});

			// Not on same domain/port or protocol
			if (t.host != u.host || t.port != u.port || t.protocol != u.protocol)
				return u.getURI();

			return t.toRelPath(t.path, u.path);
		},

		toAbsolute : function(u, nh) {
			return new tinymce.util.URI(u, {base_uri : this.getURI()}).getURI(nh);
		},

		toRelPath : function(base, path) {
			var items, bp = 0, out = '', i;

			// Split the paths
			base = base.substring(0, base.lastIndexOf('/'));
			base = base.split('/');
			items = path.split('/');

			if (base.length >= items.length) {
				for (i = 0; i < base.length; i++) {
					if (i >= items.length || base[i] != items[i]) {
						bp = i + 1;
						break;
					}
				}
			}

			if (base.length < items.length) {
				for (i = 0; i < items.length; i++) {
					if (i >= base.length || base[i] != items[i]) {
						bp = i + 1;
						break;
					}
				}
			}

			if (bp == 1)
				return path;

			for (i = 0; i < base.length - (bp - 1); i++)
				out += "../";

			for (i = bp - 1; i < items.length; i++) {
				if (i != bp - 1)
					out += "/" + items[i];
				else
					out += items[i];
			}

			return out;
		},

		toAbsPath : function(base, path) {
			var i, nb = 0, o = [];

			// Split paths
			base = base.split('/');
			path = path.split('/');

			// Remove empty chunks
			each(base, function(k) {
				if (k)
					o.push(k);
			});

			base = o;

			// Merge relURLParts chunks
			for (i = path.length - 1, o = []; i >= 0; i--) {
				// Ignore empty or .
				if (path[i].length == 0 || path[i] == ".")
					continue;

				// Is parent
				if (path[i] == '..') {
					nb++;
					continue;
				}

				// Move up
				if (nb > 0) {
					nb--;
					continue;
				}

				o.push(path[i]);
			}

			i = base.length - nb;

			// If /a/b/c or /
			if (i <= 0)
				return '/' + o.reverse().join('/');

			return '/' + base.slice(0, i).join('/') + '/' + o.reverse().join('/');
		},

		getBaseURI : function() {
			var t = this;

			if (!t.baseURI)
				t.baseURI = new tinymce.util.URI(t.settings.base_uri);

			return t.baseURI;
		},

		getURI : function(nh) {
			var s, t = this;

			// Rebuild source
			if (!t.source || nh) {
				s = '';

				if (!nh || (t.host != t.getBaseURI().host)) {
					if (t.protocol)
						s += t.protocol + '://';

					if (t.userInfo)
						s += t.userInfo + '@';

					if (t.host)
						s += t.host;

					if (t.port)
						s += ':' + t.port;
				}

				if (t.path)
					s += t.path;

				if (t.query)
					s += '?' + t.query;

				if (t.anchor)
					s += '#' + t.anchor;

				t.source = s;
			}

			return t.source;
		}
	});
})();

/* file:jscripts/tiny_mce/classes/util/Cookie.js */

(function() {
	var each = tinymce.each;

	tinymce.create('static tinymce.util.Cookie', {
		getHash : function(n) {
			var v = this.get(n), h;

			if (v) {
				each(v.split('&'), function(v) {
					v = v.split('=');
					h = h || {};
					h[unescape(v[0])] = unescape(v[1]);
				});
			}

			return h;
		},

		setHash : function(n, v, e, p, d, s) {
			var o = '';

			each(v, function(v, k) {
				o += (!o ? '' : '&') + escape(k) + '=' + escape(v);
			});

			this.set(n, o, e, p, d, s);
		},

		get : function(n) {
			var c = document.cookie, e, p = n + "=", b = c.indexOf("; " + p);

			if (b == -1) {
				b = c.indexOf(p);

				if (b != 0)
					return null;
			} else
				b += 2;

			e = c.indexOf(";", b);

			if (e == -1)
				e = c.length;

			return unescape(c.substring(b + p.length, e));
		},

		set : function(n, v, e, p, d, s) {
			document.cookie = n + "=" + escape(v) +
				((e) ? "; expires=" + e.toGMTString() : "") +
				((p) ? "; path=" + escape(p) : "") +
				((d) ? "; domain=" + d : "") +
				((s) ? "; secure" : "");
		},

		remove : function(n, p) {
			var d = new Date();

			d.setTime(d.getTime() - 1000);

			this.set(n, '', d, p, d);
		}
	});
})();

/* file:jscripts/tiny_mce/classes/util/JSON.js */

tinymce.create('static tinymce.util.JSON', {
	serialize : function(o) {
		var i, v, s = tinymce.util.JSON.serialize, t;

		if (o == null)
			return 'null';

		t = typeof o;

		if (t == 'string') {
			v = '\bb\tt\nn\ff\rr\""\'\'\\\\';

			return '"' + o.replace(/([\u0080-\uFFFF\x00-\x1f\"\'])/g, function(a, b) {
				i = v.indexOf(b);

				if (i + 1)
					return '\\' + v.charAt(i + 1);

				a = b.charCodeAt().toString(16);

				return '\\u' + '0000'.substring(a.length) + a;
			}) + '"';
		}

		if (t == 'object') {
			if (o instanceof Array) {
					for (i=0, v = '['; i<o.length; i++)
						v += (i > 0 ? ',' : '') + s(o[i]);

					return v + ']';
				}

				v = '{';

				for (i in o)
					v += typeof o[i] != 'function' ? (v.length > 1 ? ',"' : '"') + i + '":' + s(o[i]) : '';

				return v + '}';
		}

		return '' + o;
	},

	parse : function(s) {
		// Since Safari craches it is now more insecure
		if (!tinymce.isWebKit) {
			if (!/^("(\\.|[^"\\\n\r])*?"|[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t])+?$/.test(s))
				return;
		}

		try {
			return eval('(' + s + ')');
		} catch (ex) {
			// Ignore
		}
	}
});

/* file:jscripts/tiny_mce/classes/util/XHR.js */

tinymce.create('static tinymce.util.XHR', {
	send : function(o) {
		var x, t, w = window, c = 0;

		// Default settings
		o.scope = o.scope || this;
		o.success_scope = o.success_scope || o.scope;
		o.error_scope = o.error_scope || o.scope;
		o.content_type = o.content_type || 'text/plain';
		o.async = o.async === false ? false : true;
		o.data = o.data || '';

		function get(s) {
			x = 0;

			try {
				x = new ActiveXObject(s);
			} catch (ex) {
			}

			return x;
		};

		x = w.XMLHttpRequest ? new XMLHttpRequest() : get('Msxml2.XMLHTTP') || get('Microsoft.XMLHTTP');

		if (x) {
			if (x.overrideMimeType)
				x.overrideMimeType(o.content_type);

			x.async = o.async;
			x.open(o.type || (o.data ? 'POST' : 'GET'), o.url, o.async);
			x.setRequestHeader('Content-Type', o.content_type);
			x.send(o.data);

			// Wait for response
			t = w.setInterval(function() {
				if (x.readyState == 4 || c++ > 10000) {
					w.clearInterval(t);

					if (o.success && c < 10000 && x.status == 200)
						o.success.call(o.success_scope, '' + x.responseText, x, o);
					else if (o.error)
						o.error.call(o.error_scope, c > 10000 ? 'TIMED_OUT' : 'GENERAL', x, o);

					x = null;
				}
			}, 10);
		}
	}
});

/* file:jscripts/tiny_mce/classes/util/JSONRequest.js */

(function() {
	var extend = tinymce.extend, JSON = tinymce.util.JSON, XHR = tinymce.util.XHR;

	tinymce.create('tinymce.util.JSONRequest', {
		JSONRequest : function(s) {
			this.settings = extend({
			}, s);
			this.count = 0;
		},

		send : function(o) {
			var ecb = o.error, scb = o.success;

			o = extend(this.settings, o);

			o.success = function(c, x) {
				c = JSON.parse(c);

				if (typeof(c) == 'undefined') {
					c = {
						error : 'JSON Parse error.'
					};
				}

				if (c.error)
					ecb.call(o.error_scope || o.scope, c.error, x);
				else
					scb.call(o.success_scope || o.scope, c.result);
			};

			o.error = function(ty, x) {
				ecb.call(o.error_scope || o.scope, ty, x);
			};

			o.data = JSON.serialize({
				id : o.id || 'c' + (this.count++),
				method : o.method,
				params : o.params
			});

			XHR.send(o);
		},

		'static' : {
			sendRPC : function(o) {
				return new tinymce.util.JSONRequest().send(o);
			}
		}
	});
}());
/* file:jscripts/tiny_mce/classes/dom/DOMUtils.js */

(function() {
	// Shorten names
	var each = tinymce.each, is = tinymce.is;
	var isWebKit = tinymce.isWebKit, isIE = tinymce.isIE;

	tinymce.create('tinymce.dom.DOMUtils', {
		doc : null,
		root : null,
		files : null,
		listeners : {},
		pixelStyles : /^(top|left|bottom|right|width|height|borderWidth)$/,

		DOMUtils : function(d, s) {
			var t = this;

			t.doc = d;
			t.files = {};
			t.cssFlicker = false;
			t.counter = 0;
			t.boxModel = !tinymce.isIE || d.compatMode == "CSS1Compat"; 

			this.settings = tinymce.extend({
				keep_values : false,
				hex_colors : 1
			}, s);

			// Fix IE6SP2 flicker and check it failed for pre SP2
			if (tinymce.isIE6) {
				try {
					d.execCommand('BackgroundImageCache', false, true);
				} catch (e) {
					t.cssFlicker = true;
				}
			}

			tinymce.addUnload(function() {
				t.doc = t.root = null;
			});
		},

		getRoot : function() {
			var t = this, s = t.settings;

			return (s && t.get(s.root_element)) || t.doc.body;
		},

		getViewPort : function(w) {
			var d, b;

			w = !w ? window : w;
			d = w.document;
			b = this.boxModel ? d.documentElement : d.body;

			return {
				x : w.pageXOffset || b.scrollLeft,
				y : w.pageYOffset || b.scrollTop,
				w : w.innerWidth || b.clientWidth,
				h : w.innerHeight || b.clientHeight
			};
		},

		getRect : function(e) {
			var p, t = this;

			e = t.get(e);
			p = t.getPos(e);

			return {
				x : p.x,
				y : p.y,
				w : parseInt(t.getStyle(e, 'width')) || e.offsetWidth || e.clientWidth,
				h : parseInt(t.getStyle(e, 'height')) || e.offsetHeight || e.clientHeight
			};
		},

		getParent : function(n, f, r) {
			var na;

			n = this.get(n);

			// Wrap node name as func
			if (is(f, 'string')) {
				na = f.toUpperCase();

				f = function(n) {
					var s = false;

					// Any element
					if (n.nodeType == 1 && na === '*') {
						s = true;
						return false;
					}

					each(na.split(','), function(v) {
						if (n.nodeType == 1 && n.nodeName == v) {
							s = true;
							return false; // Break loop
						}
					});

					return s;
				};
			}

			while (n) {
				if (n == r)
					return null;

				if (f(n))
					return n;

				n = n.parentNode;
			}

			return null;
		},

		get : function(e) {
			if (typeof(e) == 'string')
				return this.doc.getElementById(e);

			return e;
		},

		walk : function(n, f, s) {
			var d = this.doc, w;

			if (d.createTreeWalker) {
				w = d.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, false);

				while ((n = w.nextNode()) != null)
					f.call(s || this, n);
			} else
				tinymce.walk(n, 'childNodes', f, s);
		},

		select : function(p, s) {
			var o = [], r = [], i, t = this, pl, ru, pu, x, u, xp;

			s = !s ? t.doc : t.get(s);

			// Simplest rule "tag"
			if (/^([a-z0-9]+)$/.test(p))
				return s.getElementsByTagName(p);

			// Parse pattern into rules
			for (i=0, pl=p.split(','); i<pl.length; i++) {
				ru = [];
				xp = '.';

				for (x=0, pu=pl[i].split(' '); x<pu.length; x++) {
					u = pu[x];

					if (u != '') {
						u = u.match(/^([\w\\]+)?(?:#([\w\\]+))?(?:\.([\w\\\.]+))?(?:\[\@([\w\\]+)([\^\$\*!]?=)([\w\\]+)\])?(?:\:([\w\\]+))?/i);

						// Build xpath if supported
						if (document.evaluate) {
							xp += u[1] ? '//' + u[1] : '//*';

							// Id
							if (u[2])
								xp += "[@id='" + u[2] + "']";

							// Class
							if (u[3]) {
								each(u[3].split('.'), function(i, n) {
									xp += "[@class = '" + n + "' or contains(concat(' ', @class, ' '), ' " + n + " ')]";
								});
							}

							// Attr
							if (u[4]) {
								// Comparators
								if (u[5]) {
									if (u[5] == '^=')
										xp += "[starts-with(@" + u[4] + ",'" + u[6] + "')]";
									else if (u[5] == '$=')
										xp += "[contains(concat(@" + u[4] + ",'\0'),'" + u[6] + "\0')]";
									else if (u[5] == '*=')
										xp += "[contains(@" + u[4] + ",'" + u[6] + "')]";
									else if (u[5] == '!=')
										xp += "[@" + u[4] + "!='" + u[6] + "']";
								} else
									xp += "[@" + u[4] + "='" + u[6] + "']";
							}

							//console.debug(u);
						} else
							ru.push({ tag : u[1], id : u[2], cls : u[3] ? new RegExp('\\b' + u[3].replace(/\./g, '|') + '\\b') : null, attr : u[4], val : u[5] });
					}
				}

				//console.debug(xp);

				if (xp.length > 1)
					ru.xpath = xp;

				r.push(ru);
			}

			// Used by IE since it doesn't support XPath
			function find(e, rl, p) {
				var nl, i, n, ru = rl[p];

				for (i=0, nl = e.getElementsByTagName(!ru.tag ? '*' : ru.tag); i<nl.length; i++) {
					n = nl[i];

					if (ru.id && n.id != ru.id)
						continue;

					if (ru.cls && !ru.cls.test(n.className))
						continue;

					if (ru.attr && t.getAttrib(n, ru.attr) != ru.val)
						continue;

					if (p < rl.length - 1)
						find(n, rl, p + 1);
					else
						o.push(n);
				}
			};

			// Find elements based on rules
			for (i=0; i<r.length; i++) {
				if (r[i].xpath) {
					ru = this.doc.evaluate(r[i].xpath, s, null, 4, null);

					while (u = ru.iterateNext())
						o.push(u);
				} else
					find(s, r[i], 0);
			}

			return o;
		},

		add : function(p, n, a, h) {
			var t = this, e, k;

			p = typeof(p) == 'string' ? t.get(p) : p;
			e = is(n, 'string') ? t.doc.createElement(n) : n;

			if (a) {
				for (k in a) {
					if (a.hasOwnProperty(k) && !is(a[k], 'object'))
						t.setAttrib(e, k, '' + a[k]);
				}

				if (a.style && !is(a.style, 'string')) {
					each(a.style, function(v, n) {
						t.setStyle(e, n, v);
					});
				}
			}

			if (h) {
				if (h.nodeType)
					e.appendChild(h);
				else
					e.innerHTML = h;
			}

			return p ? p.appendChild(e) : e;
		},

		addAll : function(te, ne) {
			var i, n, t = this;

			te = t.get(te);

			if (is(ne, 'string'))
				te.appendChild(t.doc.createTextNode(ne));
			else if (ne.length) {
				te = te.appendChild(t.create(ne[0], ne[1]));

				for (i=2; i<ne.length; i++)
					t.addAll(te, ne[i]);
			}
		},

		create : function(n, a, h) {
			return this.add(0, n, a, h);
		},

		createHTML : function(n, a, h) {
			var o = '', t = this, k;

			o += '<' + n;

			for (k in a) {
				if (a.hasOwnProperty(k))
					o += ' ' + k + '="' + t.encode(a[k]) + '"';
			}

			if (tinymce.is(h))
				return o + '>' + h + '</' + n + '>';

			return o + ' />';
		},

		remove : function(n, k) {
			var p;

			n = this.get(n);

			if (!n)
				return null;

			p = n.parentNode;

			if (!p)
				return null;

			if (k) {
				each (n.childNodes, function(c) {
					p.insertBefore(c.cloneNode(true), n);
				});
			}

			return p.removeChild(n);
		},

		setStyle : function(n, na, v){
			var s, i;

			if (!n)
				return false;

			n = typeof(n) == 'string' ? n.split(',') : [n];

			for (i=0; i<n.length; i++) {
				s = this.get(n[i]);

				if (!s)
					continue;

				s = s.style;

				// Camelcase it, if needed
				na = na.replace(/-(\D)/g, function(a, b){
					return b.toUpperCase();
				});

				// Default px suffix on these
				if (this.pixelStyles.test(na) && (tinymce.is(v, 'number') || /^[\-0-9\.]+$/.test(v)))
					v += 'px';

				switch (na) {
					case 'opacity':
						// IE specific opacity
						if (isIE) {
							s.filter = "alpha(opacity=" + (v * 100) + ")";

							if (!n.currentStyle || !n.currentStyle.hasLayout)
								s.display = 'inline-block';
						}

						// Fix for older browsers
						s['-moz-opacity'] = s['-khtml-opacity'] = v;
						break;

					case 'float':
						isIE ? s.styleFloat = v : s.cssFloat = v;
						break;
				}

				s[na] = v;
			}
		},

		getStyle : function(n, na, c) {
			n = this.get(n);

			if (!n)
				return false;

			// Gecko
			if (this.doc.defaultView && c) {
				// Remove camelcase
				na = na.replace(/[A-Z]/g, function(a){
					return '-' + a;
				});

				try {
					return this.doc.defaultView.getComputedStyle(n, null).getPropertyValue(na);
				} catch (ex) {
					// Old safari might fail
					return null;
				}
			}

			// Camelcase it, if needed
			na = na.replace(/-(\D)/g, function(a, b){
				return b.toUpperCase();
			});

			if (na == 'float')
				na = isIE ? 'styleFloat' : 'cssFloat';

			// IE & Opera
			if (n.currentStyle && c)
				return n.currentStyle[na];

			return n.style[na];
		},

		setStyles : function(e, o) {
			var t = this;

			each(o, function(v, n) {
				t.setStyle(e, n, v);
			});
		},

		setAttrib : function(e, n, v) {
			var t = this, s = t.settings;

			e = t.get(e);

			if (!e)
				return 0;

			switch (n) {
				case "style":
					if (s.keep_values)
						e.setAttribute('mce_style', v, 2);

					e.style.cssText = v;
					break;

				case "class":
					e.className = v;
					break;

				case "src":
				case "href":
					if (s.keep_values) {
						if (s.url_converter)
							v = s.url_converter.call(s.url_converter_scope || t, v, n, e);

						t.setAttrib(e, 'mce_' + n, v, 2);
					}

					break;
			}

			if (v !== null && v.length !== 0)
				e.setAttribute(n, '' + v, 2);
			else
				e.removeAttribute(n, 2);

			return 1;
		},

		setAttribs : function(e, o) {
			var t = this;

			each(o, function(v, n) {
				t.setAttrib(e, n, v);
			});
		},

		getAttrib : function(e, n, dv) {
			var v, t = this;

			e = t.get(e);

			if (!e)
				return false;

			if (!is(dv))
				dv = "";

			// Try the mce variant for these
			if (/^(src|href|style)$/.test(n)) {
				v = t.getAttrib(e, "mce_" + n);

				if (v)
					return v;
			}

			v = e.getAttribute(n, 2);

			if (!v) {
				switch (n) {
					case 'class':
						v = e.className;
						break;

					default:
						v = e.attributes[n];
						v = v && is(v.nodeValue) ? v.nodeValue : v;
				}
			}

			switch (n) {
				case 'style':
					v = v || e.style.cssText;

					if (v) {
						v = t.serializeStyle(t.parseStyle(v));

						if (t.settings.keep_values)
							e.setAttribute('mce_style', v);
					}

					break;
			}

			// Remove Apple and WebKit stuff
			if (isWebKit && n == "class" && v)
				v = v.replace(/(apple|webkit)\-[a-z\-]+/gi, '');

			// Handle IE issues
			if (isIE) {
				switch (n) {
					case 'rowspan':
					case 'colspan':
						// IE returns 1 as default value
						if (v === 1)
							v = '';

						break;

					case 'size':
						// IE returns +0 as default value for size
						if (v === '+0')
							v = '';

						break;

					case 'hspace':
						// IE returns -1 as default value
						if (v === -1)
							v = '';

						break;

					case 'tabindex':
						// IE returns 32768 as default value
						if (v === 32768)
							v = '';

						break;

					default:
						// IE has odd anonymous function for event attributes
						if (n.indexOf('on') === 0 && v)
							v = ('' + v).replace(/^function\s+anonymous\(\)\s+\{\s+(.*)\s+\}$/, '$1');
				}
			}

			return (v && v != '') ? '' + v : dv;
		},

		getPos : function(n) {
			var t = this, x = 0, y = 0, e, d = t.doc;

			n = t.get(n);

			// Use getBoundingClientRect on IE, Opera has it but it's not perfect
			if (n && isIE) {
				n = n.getBoundingClientRect();
				e = t.boxModel ? d.documentElement : d.body;
				x = t.getStyle(t.select('html')[0], 'borderWidth'); // Remove border
				x = (x == 'medium' || t.boxModel && !t.isIE6) && 2 || x;

				return {x : n.left + e.scrollLeft - x, y : n.top + e.scrollTop - x};
			}

			while (n) {
				x += n.offsetLeft || 0;
				y += n.offsetTop || 0;
				n = n.offsetParent;
			}

			return {x : x, y : y};
		},

		parseStyle : function(st) {
			var t = this, s = t.settings, o = {};

			if (!st)
				return o;

			function compress(p, s, ot) {
				var t, r, b, l;

				// Get values and check it it needs compressing
				t = o[p + '-top' + s];
				if (!t)
					return;

				r = o[p + '-right' + s];
				if (t != r)
					return;

				b = o[p + '-bottom' + s];
				if (r != b)
					return;

				l = o[p + '-left' + s];
				if (b != l)
					return;

				// Compress
				o[ot] = l;
				delete o[p + '-top' + s];
				delete o[p + '-right' + s];
				delete o[p + '-bottom' + s];
				delete o[p + '-left' + s];
			};

			each(st.split(';'), function(v) {
				var sv;

				if (v) {
					v = v.split(':');
					sv = tinymce.trim(v[1]);

					sv = sv.replace(/rgb\([^\)]+\)/g, function(v) {
						return t.toHex(v);
					});

					if (s.url_converter) {
						sv = sv.replace(/url\([\'\"]?([^\)\'\"]+)\)/g, function(x, c) {
							return 'url(' + t.encode(s.url_converter.call(s.url_converter_scope || t, t.decode(c), 'style', null)) + ')';
						});
					}

					o[tinymce.trim(v[0]).toLowerCase()] = sv;
				}
			});

			compress("border", "", "border");
			compress("border", "-width", "border-width");
			compress("border", "-color", "border-color");
			compress("border", "-style", "border-style");
			compress("padding", "", "padding");
			compress("margin", "", "margin");

			return o;
		},

		serializeStyle : function(o) {
			var s = '';

			each(o, function(v, k) {
				if (k && v) {
					switch (k) {
						case 'color':
						case 'background-color':
							v = v.toLowerCase();
							break;
					}

					s += (s ? ' ' : '') + k + ': ' + v + ';';
				}
			});

			return s;
		},

		loadCSS : function(u) {
			var t = this, d = this.doc;

			if (!u)
				u = '';

			each(u.split(','), function(u) {
				if (t.files[u])
					return;

				t.files[u] = true;

				if (!d.createStyleSheet)
					t.add(t.select('head')[0], 'link', {rel : 'stylesheet', href : u});
				else
					d.createStyleSheet(u);
			});
		},

		addClass : function(e, c, b) {
			var o;

			e = this.get(e);

			if (!e || !c)
				return 0;

			o = this.removeClass(e, c);

			return e.className = b ? c + (o != '' ? (' ' + o) : '') : (o != '' ? (o + ' ') : '') + c;
		},

		removeClass : function(e, c) {
			e = this.get(e);

			if (!e)
				return 0;

			c = e.className.replace(new RegExp("(^|\\s+)" + c + "(\\s+|$)", "g"), ' ');

			return e.className = c != ' ' ? c : '';
		},

		replaceClass : function(e, o, n) {
			e = this.get(e);

			if (e)
				e.className = (e.className + '').replace(new RegExp('\\b' + o + '\\b', 'g'), n);
		},

		hasClass : function(n, c) {
			n = this.get(n);

			if (!n || !c)
				return false;

			return new RegExp('\\b' + c + '\\b', 'g').test(n.className);
		},

		uniqueId : function(p) {
			return (!p ? 'mce_' : p) + (this.counter++);
		},

		show : function(e) {
			this.setStyle(e, 'display', 'block');
		},

		hide : function(e) {
			this.setStyle(e, 'display', 'none');
		},

		isHidden : function(e) {
			e = this.get(e);

			return e.style.display == 'none' || this.getStyle(e, 'display') == 'none';
		},

		setHTML : function(e, h) {
			var t = this;

			e = t.get(e);
			h = t.processHTML(h);

			if (isIE) {
				// Fix for IE bug, first node comments gets stripped
				e.innerHTML = '<br />' + h;
				e.removeChild(e.firstChild);
			} else
				e.innerHTML = h;

			return h;
		},

		processHTML : function(h) {
			var t = this, s = t.settings;

			// Convert strong and em to b and i in FF since it can't handle them
			if (tinymce.isGecko) {
				h = h.replace(/<(\/?)strong>|<strong( [^>]+)>/gi, '<$1b$2>');
				h = h.replace(/<(\/?)em>|<em( [^>]+)>/gi, '<$1i$2>');
			}

			// Store away src and href in mce_src and mce_href since browsers mess them up
			if (s.keep_values) {
				// Process all tags with src, href or style
				h = h.replace(/<([\w:]+) [^>]*(src|href|style)[^>]*>/gi, function(a, n) {
					function handle(m, b, c) {
						var u = c;

						// Tag already got a mce_ version
						if (a.indexOf('mce_' + b) != -1)
							return m;

						if (b == 'style') {
							// Why did I need this one?
							//if (isIE)
							//	u = t.serializeStyle(t.parseStyle(u));

							if (s.hex_colors) {
								u = u.replace(/rgb\([^\)]+\)/g, function(v) {
									return t.toHex(v);
								});
							}

							if (s.url_converter) {
								u = u.replace(/url\([\'\"]?([^\)\'\"]+)\)/g, function(x, c) {
									return 'url(' + t.encode(s.url_converter.call(s.url_converter_scope || t, t.decode(c), b, n)) + ')';
								});
							}
						} else {
							if (s.url_converter)
								u = t.encode(s.url_converter.call(s.url_converter_scope || t, t.decode(c), b, n));
						}

						return ' ' + b + '="' + c + '" mce_' + b + '="' + u + '"';
					};

					a = a.replace(/ (src|href|style)=[\"\']([^\"\']+)[\"\']/gi, handle); // W3C
					return a.replace(/ (src|href|style)=([^\s\"\'>]+)/gi, handle); // IE
				});
			}

			return h;
		},

		getOuterHTML : function(e) {
			var d;

			e = this.get(e);

			if (!e)
				return null;

			if (isIE)
				return e.outerHTML;

			d = (e.ownerDocument || this.doc).createElement("body");
			d.appendChild(e.cloneNode(true));

			return d.innerHTML;
		},

		setOuterHTML : function(e, h, d) {
			var n, t = this, tp;

			e = t.get(e);
			d = d || e.ownerDocument || t.doc;

			if (isIE && e.nodeType == 1)
				e.outerHTML = h;
			else {
				tp = d.createElement("body");
				tp.innerHTML = h;

				n = tp.firstChild;
				while (n) {
					t.insertAfter(n.cloneNode(true), e);
					n = n.nextSibling;
				}

				t.remove(e);
			}
		},

		decode : function(s) {
			var e = document.createElement("div");

			e.innerHTML = s;

			return !e.firstChild ? s : e.firstChild.nodeValue;
		},

		encode : function(s) {
			return s ? ('' + s).replace(/[<>&\"]/g, function (c, b) {
				switch (c) {
					case '&':
						return '&amp;';

					case '"':
						return '&quot;';

					case '<':
						return '&lt;';

					case '>':
						return '&gt;';
				}

				return c;
			}) : s;
		},

		insertAfter : function(n, r) {
			var p, t = this, ns;

			n = t.get(n);
			r = t.get(r);

			p = r.parentNode;
			ns = r.nextSibling;

			if (ns)
				p.insertBefore(n, ns);
			else
				p.appendChild(n);

			return n;
		},

		isBlock : function(n) {
			if (n.nodeType && n.nodeType !== 1)
				return false;

			n = n.nodeName || n;

			return /^(H[1-6]|P|DIV|ADDRESS|PRE|FORM|TABLE|LI|OL|UL|TD|CAPTION|BLOCKQUOTE|CENTER|DL|DT|DD|DIR|FIELDSET|FORM|NOSCRIPT|NOFRAMES|MENU|ISINDEX|SAMP)$/.test(n);
		},

		replace : function(n, o, k) {
			n = this.get(n);
			o = this.get(o);

			if (k) {
				each (o.childNodes, function(c) {
					n.appendChild(c.cloneNode(true));
				});
			}

			return o.parentNode.replaceChild(n, o);
		},

		toHex : function(s, k) {
			var c = /^\s*rgb\s*?\(\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?\)\s*$/i.exec(s);

			function hex(s) {
				s = parseInt(s).toString(16);

				return s.length > 1 ? s : '0' + s; // 0 -> 00
			};

			if (c) {
				s = '#' + hex(c[1]) + hex(c[2]) + hex(c[3]);

				return s;
			}

			return s;
		}

		/*
		toRGB : function(s) {
			var c = /^\s*?#([0-9A-F]{2})([0-9A-F]{1,2})([0-9A-F]{2})?\s*?$/.exec(s);

			if (c) {
				// #FFF -> #FFFFFF
				if (!is(c[3]))
					c[3] = c[2] = c[1];

				return "rgb(" + parseInt(c[1], 16) + "," + parseInt(c[2], 16) + "," + parseInt(c[3], 16) + ")";
			}

			return s;
		}
		*/
	});

	// Setup page DOM
	tinymce.DOM = new tinymce.dom.DOMUtils(document);
})();

/* file:jscripts/tiny_mce/classes/dom/Event.js */

(function() {
	// Shorten names
	var each = tinymce.each, DOM = tinymce.DOM, isIE = tinymce.isIE, isWebKit = tinymce.isWebKit, Event;

	tinymce.create('static tinymce.dom.Event', {
		inits : [],
		events : [],

		add : function(o, n, f, s) {
			var cb, t = this, el = t.events;

			o = DOM.get(o);

			if (!o)
				return;

			// Setup event callback
			cb = function(e) {
				e = e || window.event;

				// Patch in target in IE it's W3C valid
				if (e && !e.target && isIE)
					e.target = e.srcElement;

				if (!s)
					return f(e);

				return f.call(s, e);
			};

			if (n == 'unload') {
				tinymce.unloads.unshift({func : cb});
				return cb;
			}

			if (n == 'init') {
				if (t.domLoaded)
					cb();
				else
					t.inits.push(cb);

				return cb;
			}

			// Store away listener reference
			el.push({
				obj : o,
				name : n,
				func : f,
				cfunc : cb,
				scope : s
			});

			t._add(o, n, cb);

			return f;
		},

		remove : function(o, n, f) {
			var t = this, a = t.events, s = false;

			o = DOM.get(o);

			each(a, function(e, i) {
				if (e.obj == o && e.name == n && (!f || (e.func == f || e.cfunc == f))) {
					a.splice(i, 1);
					t._remove(o, n, e.cfunc);
					s = true;
					return false;
				}
			});

			return s;
		},

		cancel : function(e) {
			if (!e)
				return false;

			this.stop(e);
			return this.prevent(e);
		},

		stop : function(e) {
			if (e.stopPropagation)
				e.stopPropagation();
			else
				e.cancelBubble = true;

			return false;
		},

		prevent : function(e) {
			if (e.preventDefault)
				e.preventDefault();
			else
				e.returnValue = false;

			return false;
		},

		_unload : function() {
			var t = Event;

			each(t.events, function(e, i) {
				t._remove(e.obj, e.name, e.cfunc);
				e.obj = e.cfunc = null;
			});

			t.events = [];
			t = null;
		},

		_add : function(o, n, f) {
			if (o.attachEvent)
				o.attachEvent('on' + n, f);
			else if (o.addEventListener)
				o.addEventListener(n, f, false);
			else
				o['on' + n] = f;
		},

		_remove : function(o, n, f) {
			if (o.detachEvent)
				o.detachEvent('on' + n, f);
			else if (o.removeEventListener)
				o.removeEventListener(n, f, false);
			else
				o['on' + n] = null;
		},

		_pageInit : function() {
			var e = Event;

			e._remove(window, 'DOMContentLoaded', e._pageInit);
			e.domLoaded = true;

			each(e.inits, function(c) {
				c();
			});

			e.inits = [];
		},

		_wait : function() {
			var t;

			if (isIE && document.location.protocol != 'https:') {
				// Fake DOMContentLoaded on IE when not running under HTTPs
				document.write('<script id=__ie_onload defer src=javascript:void(0)><\/script>');
				DOM.get("__ie_onload").onreadystatechange = function() {
					if (this.readyState == "complete") {
						Event._pageInit();
						DOM.get("__ie_onload").onreadystatechange = null; // Prevent leak
					}
				};
			} else {
				Event._add(window, 'DOMContentLoaded', Event._pageInit, Event);

				if (isIE || isWebKit) {
					t = setInterval(function() {
						if (/loaded|complete/.test(document.readyState)) {
							clearInterval(t);
							Event._pageInit();
						}
					}, 10);
				}
			}
		}
	});

	// Shorten name
	Event = tinymce.dom.Event;

	// Dispatch DOM content loaded event for IE and Safari
	Event._wait();
	tinymce.addUnload(Event._unload);
})();

/* file:jscripts/tiny_mce/classes/dom/Element.js */

(function() {
	var each = tinymce.each;

	tinymce.create('tinymce.dom.Element', {
		Element : function(id, s) {
			var t = this, dom, el;

			s = s || {};
			t.id = id;
			t.dom = dom = s.dom || tinymce.DOM;
			t.settings = s;

			// Only IE leaks DOM references, this is a lot faster
			if (!tinymce.isIE)
				el = t.dom.get(t.id);

			each([
				'getPos',
				'getRect',
				'getParent',
				'add',
				'setStyle',
				'getStyle',
				'setStyles',
				'setAttrib',
				'setAttribs',
				'getAttrib',
				'addClass',
				'removeClass',
				'replaceClass',
				'hasClass',
				'getOuterHTML',
				'setOuterHTML',
				'remove',
				'show',
				'hide',
				'isHidden',
				'setHTML',
				'get'
			], function(k) {
				t[k] = function() {
					var a = arguments, o;

					// Opera fails
					if (tinymce.isOpera) {
						a = [id];

						each(arguments, function(v) {
							a.push(v);
						});
					} else
						Array.prototype.unshift.call(a, el || id);

					o = dom[k].apply(dom, a);
					t.update(k);

					return o;
				};
			});
		},

		on : function(n, f, s) {
			return tinymce.dom.Event.add(this.id, n, f, s);
		},

		getXY : function() {
			return {
				x : parseInt(this.getStyle('left')),
				y : parseInt(this.getStyle('top'))
			};
		},

		getSize : function() {
			var n = this.dom.get(this.id);

			return {
				w : parseInt(this.getStyle('width') || n.clientWidth),
				h : parseInt(this.getStyle('height') || n.clientHeight)
			};
		},

		moveTo : function(x, y) {
			this.setStyles({left : x, top : y});
		},

		moveBy : function(x, y) {
			var p = this.getXY();

			this.moveTo(p.x + x, p.y + y);
		},

		resizeTo : function(w, h) {
			this.setStyles({width : w, height : h});
		},

		resizeBy : function(w, h) {
			var s = this.getSize();

			this.resizeTo(s.w + w, s.h + h);
		},

		update : function(k) {
			var t = this, b, dom = t.dom;

			if (tinymce.isIE6 && t.settings.blocker) {
				k = k || '';

				// Ignore getters
				if (k.indexOf('get') === 0 || k.indexOf('has') === 0 || k.indexOf('is') === 0)
					return;

				// Remove blocker on remove
				if (k == 'remove') {
					dom.remove(t.blocker);
					return;
				}

				if (!t.blocker) {
					t.blocker = dom.uniqueId();
					b = dom.add(t.settings.container || dom.getRoot(), 'iframe', {id : t.blocker, style : 'position:absolute;', frameBorder : 0, src : 'javascript:""'});
					dom.setStyle(b, 'opacity', 0);
				} else
					b = dom.get(t.blocker);

				dom.setStyle(b, 'left', t.getStyle('left', 1));
				dom.setStyle(b, 'top', t.getStyle('top', 1));
				dom.setStyle(b, 'width', t.getStyle('width', 1));
				dom.setStyle(b, 'height', t.getStyle('height', 1));
				dom.setStyle(b, 'display', t.getStyle('display', 1));
				dom.setStyle(b, 'zIndex', parseInt(t.getStyle('zIndex', 1) || 0) - 1);
			}
		}
	});
})();

/* file:jscripts/tiny_mce/classes/dom/Selection.js */

(function() {
	// Shorten names
	var is = tinymce.is, isIE = tinymce.isIE, each = tinymce.each;

	tinymce.create('tinymce.dom.Selection', {
		Selection : function(dom, win, serializer) {
			var t = this;

			t.dom = dom;
			t.win = win;
			t.serializer = serializer;

			tinymce.addUnload(function() {
				t.win = null;
			});
		},

		getContent : function(s) {
			var t = this, r = t.getRng(), e = t.dom.create("body"), se = t.getSel(), wb, wa;

			s = s || {};
			wb = wa = '';
			s.get = true;
			s.format = s.format || 'html';

			if (s.format == 'text')
				return t.isCollapsed() ? '' : (r.text || (se.toString ? se.toString() : ''));

			if (r.cloneContents)
				e.appendChild(r.cloneContents());
			else if (is(r.item) || is(r.htmlText))
				e.innerHTML = r.item ? r.item(0).outerHTML : r.htmlText;
			else
				e.innerHTML = r.toString();

			// Keep whitespace before and after
			if (/^\s/.test(e.innerHTML))
				wb = ' ';

			if (/\s+$/.test(e.innerHTML))
				wa = ' ';

			return t.isCollapsed() ? '' : wb + t.serializer.serialize(e, s) + wa;
		},

		setContent : function(h, s) {
			var t = this, r = t.getRng(), d;

			s = s || {format : 'html'};
			s.set = true;
			h = t.dom.processHTML(h);

			if (r.insertNode) {
				d = t.win.document;

				// Use insert HTML if it exists (places cursor after content)
				if (d.queryCommandEnabled('InsertHTML'))
					return d.execCommand('InsertHTML', false, h);

				r.deleteContents();
				r.insertNode(t.getRng().createContextualFragment(h));
			} else {
				if (r.item)
					r.item(0).outerHTML = h;
				else
					r.pasteHTML(h);
			}
		},

		getStart : function() {
			var t = this, r = t.getRng(), e;

			if (isIE) {
				if (r.item)
					return r.item(0);

				r = r.duplicate();
				r.collapse(1);
				e = r.parentElement();

				if (e.nodeName == 'BODY')
					return e.firstChild;

				return e;
			} else {
				e = r.startContainer;

				if (e.nodeName == 'BODY')
					return e.firstChild;

				return t.dom.getParent(e, function(n) {return n.nodeType == 1;});
			}
		},

		getEnd : function() {
			var t = this, r = t.getRng(), e;

			if (isIE) {
				if (r.item)
					return r.item(0);

				r = r.duplicate();
				r.collapse(0);
				e = r.parentElement();

				if (e.nodeName == 'BODY')
					return e.lastChild;

				return e;
			} else {
				e = r.endContainer;

				if (e.nodeName == 'BODY')
					return e.lastChild;

				return t.dom.getParent(e, function(n) {return n.nodeType == 1;});
			}
		},

		getBookmark : function(si) {
			var t = this, r = t.getRng(), tr, sx, sy, vp = t.dom.getViewPort(t.win), e, sp, bp, le, c = -0xFFFFFF, s, ro = t.dom.getRoot();

			sx = vp.x;
			sy = vp.y;

			// Simple bookmark fast but not as persistent
			if (si == 'simple')
				return {rng : r, scrollX : sx, scrollY : sy};

			// Handle IE
			if (isIE) {
				// Control selection
				if (r.item) {
					e = r.item(0);

					each(t.dom.select(e.nodeName), function(n, i) {
						if (e == n) {
							sp = i;
							return false;
						}
					});

					return {
						tag : e.nodeName,
						index : sp,
						scrollX : sx,
						scrollY : sy
					};
				}

				// Text selection
				tr = ro.createTextRange();
				tr.moveToElementText(ro);
				tr.collapse(true);
				bp = Math.abs(tr.move('character', c));

				tr = r.duplicate();
				tr.collapse(true);
				sp = Math.abs(tr.move('character', c));

				tr = r.duplicate();
				tr.collapse(false);
				le = Math.abs(tr.move('character', c)) - sp;

				return {
					start : sp - bp,
					length : le,
					scrollX : sx,
					scrollY : sy
				};
			}

			// Handle W3C
			e = t.getNode();
			s = t.getSel();

			if (!s)
				return null;

			// Image selection
			if (e && e.nodeName == 'IMG') {
				return {
					scrollX : sx,
					scrollY : sy
				};
			}

			// Text selection

			function getPos(r, sn, en) {
				var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, null, false), n, p = 0, d = {};

				while ((n = w.nextNode()) != null) {
					if (n == sn)
						d.start = p;

					if (n == en) {
						d.end = p;
						return d;
					}

					p += n.nodeValue ? n.nodeValue.length : 0;
				}

				return null;
			};

			// Caret or selection
			if (s.anchorNode == s.focusNode && s.anchorOffset == s.focusOffset) {
				e = getPos(ro, s.anchorNode, s.focusNode);

				if (!e)
					return {scrollX : sx, scrollY : sy};

				return {
					start : e.start + s.anchorOffset,
					end : e.end + s.focusOffset,
					scrollX : sx,
					scrollY : sy
				};
			} else {
				e = getPos(ro, r.startContainer, r.endContainer);

				if (!e)
					return {scrollX : sx, scrollY : sy};

				return {
					start : e.start + r.startOffset,
					end : e.end + r.endOffset,
					scrollX : sx,
					scrollY : sy
				};
			}
		},

		moveToBookmark : function(b) {
			var t = this, r = t.getRng(), s = t.getSel(), ro = t.dom.getRoot(), sd;

			function getPos(r, sp, ep) {
				var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, null, false), n, p = 0, d = {};

				while ((n = w.nextNode()) != null) {
					p += n.nodeValue ? n.nodeValue.length : 0;

					if (p >= sp && !d.startNode) {
						d.startNode = n;
						d.startOffset = sp - (p - n.nodeValue.length);
					}

					if (p >= ep) {
						d.endNode = n;
						d.endOffset = ep - (p - n.nodeValue.length);

						return d;
					}
				}

				return null;
			};

			if (!b)
				return false;

			t.win.scrollTo(b.scrollX, b.scrollY);

			// Handle explorer
			if (isIE) {
				// Handle simple
				if (r = b.rng) {
					try {
						r.select();
					} catch (ex) {
						// Ignore
					}

					return true;
				}

				t.win.focus();

				// Handle control bookmark
				if (b.tag) {
					r = ro.createControlRange();

					each(t.dom.select(b.tag), function(n, i) {
						if (i == b.index)
							r.addElement(n);
					});
				} else {
					// Try/catch needed since this operation breaks when TinyMCE is placed in hidden divs/tabs
					try {
						// Incorrect bookmark
						if (b.start < 0)
							return true;

						r = s.createRange();
						r.moveToElementText(ro);
						r.collapse(true);
						r.moveStart('character', b.start);
						r.moveEnd('character', b.length);
					} catch (ex2) {
						return true;
					}
				}

				r.select();

				return true;
			}

			// Handle W3C
			if (!s)
				return false;

			// Handle simple
			if (b.rng) {
				s.removeAllRanges();
				s.addRange(b.rng);
			} else {
				if (is(b.start) && is(b.end)) {
					try {
						sd = getPos(ro, b.start, b.end);
						if (sd) {
							r = t.dom.doc.createRange();
							r.setStart(sd.startNode, sd.startOffset);
							r.setEnd(sd.endNode, sd.endOffset);
							s.removeAllRanges();
							s.addRange(r);
						}

						if (!tinymce.isOpera)
							t.win.focus();
					} catch (ex) {
						// Ignore
					}
				}
			}
		},

		select : function(n, c) {
			var t = this, r = t.getRng(), s = t.getSel(), b, fn, ln, d = t.win.document;

			function first(n) {
				return n ? d.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, false).nextNode() : null;
			};

			function last(n) {
				var c, o, w;

				if (!n)
					return null;

				w = d.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, false);
				while (c = w.nextNode())
					o = c;

				return o;
			};

			if (isIE) {
				try {
					b = d.body;

					if (/^(IMG|TABLE)$/.test(n.nodeName)) {
						r = b.createControlRange();
						r.addElement(n);
					} else {
						r = b.createTextRange();
						r.moveToElementText(n);
					}

					r.select();
				} catch (ex) {
					// Throws illigal agrument in IE some times
				}
			} else {
				if (c) {
					fn = first(n);
					ln = last(n);

					if (fn && ln) {
						//console.debug(fn, ln);
						r = d.createRange();
						r.setStart(fn, 0);
						r.setEnd(ln, ln.nodeValue.length);
					} else
						r.selectNode(n);
				} else
					r.selectNode(n);

				t.setRng(r);
			}

			return n;
		},

		isCollapsed : function() {
			var t = this, r = t.getRng();

			if (r.item)
				return false;

			return r.boundingWidth == 0 || t.getSel().isCollapsed;
		},

		collapse : function(b) {
			var t = this, r = t.getRng(), n;

			// Control range on IE
			if (r.item) {
				n = r.item(0);
				r = this.win.document.body.createTextRange();
				r.moveToElementText(n);
			}

			r.collapse(!!b);
			t.setRng(r);
		},

		getSel : function() {
			var t = this, w = this.win;

			return w.getSelection ? w.getSelection() : w.document.selection;
		},

		getRng : function() {
			var t = this, s = t.getSel(), r;

			if (!s)
				return null;

			try {
				r = s.rangeCount > 0 ? s.getRangeAt(0) : (s.createRange ? s.createRange() : t.win.document.createRange());
			} catch (ex) {
				// IE throws unspecified error here if TinyMCE is placed in a frame/iframe
				// So lets create just an empty range for now to keep it happy
				r = this.win.document.body.createTextRange();
			}

			return r;
		},

		setRng : function(r) {
			var s;

			if (!isIE) {
				s = this.getSel();
				s.removeAllRanges();
				s.addRange(r);
			} else
				r.select();
		},

		setNode : function(n) {
			var t = this;

			t.setContent(t.dom.create('div', null, n).innerHTML);
		},

		getNode : function() {
			var t = this, r = t.getRng(), s = t.getSel(), e;

			if (!isIE) {
				// Range maybe lost after the editor is made visible again
				if (!r)
					return t.dom.getRoot();

				e = r.commonAncestorContainer;

				// Handle selection a image or other control like element such as anchors
				if (!r.collapsed) {
					if (r.startContainer == r.endContainer || (tinymce.isWebKit && r.startContainer == r.endContainer.parentNode)) {
						if (r.startOffset - r.endOffset < 2 || tinymce.isWebKit) {
							if (r.startContainer.hasChildNodes())
								e = r.startContainer.childNodes[r.startOffset];
						}
					}
				}

				return t.dom.getParent(e, function(n) {
					return n.nodeType == 1;
				});
			}

			return r.item ? r.item(0) : r.parentElement();
		}
	});
})();

/* file:jscripts/tiny_mce/classes/dom/XMLWriter.js */

(function() {
	tinymce.create('tinymce.dom.XMLWriter', {
		node : null,

		XMLWriter : function(s) {
			// Get XML document
			function getXML() {
				var i = document.implementation;

				if (!i || !i.createDocument) {
					// Try IE objects
					try {return new ActiveXObject('MSXML2.DOMDocument');} catch (ex1) {}
					try {return new ActiveXObject('Microsoft.XmlDom');} catch (ex2) {}
				} else
					return i.createDocument('', '', null);
			};

			this.doc = getXML();
			this.reset();
		},

		reset : function() {
			var t = this, d = t.doc;

			if (d.firstChild)
				d.removeChild(d.firstChild);

			t.node = d.appendChild(d.createElement("html"));
		},

		writeStartElement : function(n) {
			var t = this;

			t.node = t.node.appendChild(t.doc.createElement(n));
		},

		writeAttribute : function(n, v) {
			// Since Opera doesn't escape > into &gt; we need to do it our self
			if (tinymce.isOpera)
				v = v.replace(/>/g, '|>');

			this.node.setAttribute(n, v);
		},

		writeEndElement : function() {
			this.node = this.node.parentNode;
		},

		writeFullEndElement : function() {
			var t = this, n = t.node;

			n.appendChild(t.doc.createTextNode(""));
			t.node = n.parentNode;
		},

		writeText : function(v) {
			// Since Opera doesn't escape > into &gt; we need to do it our self
			if (tinymce.isOpera)
				v = v.replace(/>/g, '|>');

			this.node.appendChild(this.doc.createTextNode(v));
		},

		writeCDATA : function(v) {
			this.node.appendChild(this.doc.createCDATA(v));
		},

		writeComment : function(v) {
			this.node.appendChild(this.doc.createComment(v));
		},

		getContent : function() {
			var h;

			h = this.doc.xml || new XMLSerializer().serializeToString(this.doc);
			h = h.replace(/<\?[^?]+\?>|<html>|<\/html>/g, '');
			h = h.replace(/ ?\/>/g, ' />');

			// Since Opera doesn't escape > into &gt; we need to do it our self
			if (tinymce.isOpera)
				h = h.replace(/\|>/g, '&gt;');

			return h;
		}
	});
})();

/* file:jscripts/tiny_mce/classes/dom/StringWriter.js */

(function() {
	tinymce.create('tinymce.dom.StringWriter', {
		str : null,
		tags : null,
		count : 0,
		settings : null,
		indent : null,

		StringWriter : function(s) {
			this.settings = tinymce.extend({
				indent_char : ' ',
				indentation : 1
			}, s);

			this.reset();
		},

		reset : function() {
			this.indent = '';
			this.str = "";
			this.tags = [];
			this.count = 0;
		},

		writeStartElement : function(n) {
			this.writeAttributesEnd();
			this.writeRaw('<' + n);
			this.tags.push(n);
			this.inAttr = true;
			this.count++;
			this.elementCount = this.count;
		},

		writeAttribute : function(n, v) {
			var t = this;

			t.writeRaw(" " + t.encode(n) + '="' + t.encode(v) + '"');
		},

		writeEndElement : function() {
			var n;

			if (this.tags.length > 0) {
				n = this.tags.pop();

				if (this.writeAttributesEnd(1))
					this.writeRaw('</' + n + '>');

				if (this.settings.indentation > 0)
					this.writeRaw('\n');
			}
		},

		writeFullEndElement : function() {
			if (this.tags.length > 0) {
				this.writeAttributesEnd();
				this.writeRaw('</' + this.tags.pop() + '>');

				if (this.settings.indentation > 0)
					this.writeRaw('\n');
			}
		},

		writeText : function(v) {
			this.writeAttributesEnd();
			this.writeRaw(this.encode(v));
			this.count++;
		},

		writeCDATA : function(v) {
			this.writeAttributesEnd();
			this.writeRaw('<![CDATA[' + v + ']]>');
			this.count++;
		},

		writeComment : function(v) {
			this.writeAttributesEnd();
			this.writeRaw('<!-- ' + v + '-->');
			this.count++;
		},

		writeRaw : function(v) {
			this.str += v;
		},

		writeAttributesEnd : function(s) {
			if (!this.inAttr)
				return;

			this.inAttr = false;

			if (s && this.elementCount == this.count) {
				this.writeRaw(' />');
				return false;
			}

			this.writeRaw('>');

			return true;
		},

		encode : function(s) {
			return s.replace(/[<>&"]/g, function(v) {
				switch (v) {
					case '<':
						return '&lt;';

					case '>':
						return '&gt;';

					case '&':
						return '&amp;';

					case '"':
						return '&quot;';
				}

				return v;
			});
		},

		getContent : function() {
			return this.str;
		}
	});
})();

/* file:jscripts/tiny_mce/classes/dom/Serializer.js */

(function() {
	// Shorten names
	var extend = tinymce.extend, each = tinymce.each, Dispatcher = tinymce.util.Dispatcher, isIE = tinymce.isIE;

	// Returns only attribites that have values not all attributes in IE
	function getIEAtts(n) {
		var o = [];

		// Object will throw exception in IE
		if (n.nodeName == 'OBJECT')
			return n.attributes;

		n.cloneNode(false).outerHTML.replace(/([a-z0-9\-_]+)=/gi, function(a, b) {
			o.push({specified : 1, nodeName : b});
		});

		return o;
	};

	tinymce.create('tinymce.dom.Serializer', {
		Serializer : function(s) {
			var t = this;

			t.key = 0;
			t.onPreProcess = new Dispatcher(t);
			t.onPostProcess = new Dispatcher(t);
			t.writer = new tinymce.dom.XMLWriter();

			// Default settings
			t.settings = s = extend({
				dom : tinymce.DOM,
				valid_nodes : 0,
				node_filter : 0,
				attr_filter : 0,
				invalid_attrs : /^(mce_|_moz_$)/,
				closed : /(br|hr|input|meta|img|link|param)/,
				entity_encoding : 'named',
				entities : '160,nbsp,161,iexcl,162,cent,163,pound,164,curren,165,yen,166,brvbar,167,sect,168,uml,169,copy,170,ordf,171,laquo,172,not,173,shy,174,reg,175,macr,176,deg,177,plusmn,178,sup2,179,sup3,180,acute,181,micro,182,para,183,middot,184,cedil,185,sup1,186,ordm,187,raquo,188,frac14,189,frac12,190,frac34,191,iquest,192,Agrave,193,Aacute,194,Acirc,195,Atilde,196,Auml,197,Aring,198,AElig,199,Ccedil,200,Egrave,201,Eacute,202,Ecirc,203,Euml,204,Igrave,205,Iacute,206,Icirc,207,Iuml,208,ETH,209,Ntilde,210,Ograve,211,Oacute,212,Ocirc,213,Otilde,214,Ouml,215,times,216,Oslash,217,Ugrave,218,Uacute,219,Ucirc,220,Uuml,221,Yacute,222,THORN,223,szlig,224,agrave,225,aacute,226,acirc,227,atilde,228,auml,229,aring,230,aelig,231,ccedil,232,egrave,233,eacute,234,ecirc,235,euml,236,igrave,237,iacute,238,icirc,239,iuml,240,eth,241,ntilde,242,ograve,243,oacute,244,ocirc,245,otilde,246,ouml,247,divide,248,oslash,249,ugrave,250,uacute,251,ucirc,252,uuml,253,yacute,254,thorn,255,yuml,402,fnof,913,Alpha,914,Beta,915,Gamma,916,Delta,917,Epsilon,918,Zeta,919,Eta,920,Theta,921,Iota,922,Kappa,923,Lambda,924,Mu,925,Nu,926,Xi,927,Omicron,928,Pi,929,Rho,931,Sigma,932,Tau,933,Upsilon,934,Phi,935,Chi,936,Psi,937,Omega,945,alpha,946,beta,947,gamma,948,delta,949,epsilon,950,zeta,951,eta,952,theta,953,iota,954,kappa,955,lambda,956,mu,957,nu,958,xi,959,omicron,960,pi,961,rho,962,sigmaf,963,sigma,964,tau,965,upsilon,966,phi,967,chi,968,psi,969,omega,977,thetasym,978,upsih,982,piv,8226,bull,8230,hellip,8242,prime,8243,Prime,8254,oline,8260,frasl,8472,weierp,8465,image,8476,real,8482,trade,8501,alefsym,8592,larr,8593,uarr,8594,rarr,8595,darr,8596,harr,8629,crarr,8656,lArr,8657,uArr,8658,rArr,8659,dArr,8660,hArr,8704,forall,8706,part,8707,exist,8709,empty,8711,nabla,8712,isin,8713,notin,8715,ni,8719,prod,8721,sum,8722,minus,8727,lowast,8730,radic,8733,prop,8734,infin,8736,ang,8743,and,8744,or,8745,cap,8746,cup,8747,int,8756,there4,8764,sim,8773,cong,8776,asymp,8800,ne,8801,equiv,8804,le,8805,ge,8834,sub,8835,sup,8836,nsub,8838,sube,8839,supe,8853,oplus,8855,otimes,8869,perp,8901,sdot,8968,lceil,8969,rceil,8970,lfloor,8971,rfloor,9001,lang,9002,rang,9674,loz,9824,spades,9827,clubs,9829,hearts,9830,diams,338,OElig,339,oelig,352,Scaron,353,scaron,376,Yuml,710,circ,732,tilde,8194,ensp,8195,emsp,8201,thinsp,8204,zwnj,8205,zwj,8206,lrm,8207,rlm,8211,ndash,8212,mdash,8216,lsquo,8217,rsquo,8218,sbquo,8220,ldquo,8221,rdquo,8222,bdquo,8224,dagger,8225,Dagger,8240,permil,8249,lsaquo,8250,rsaquo,8364,euro',
				valid_elements : '*[*]',
				extended_valid_elements : 0,
				valid_child_elements : 0,
				invalid_elements : 0,
				fix_table_elements : 0,
				fix_list_elements : true,
				fix_content_duplication : true,
				convert_fonts_to_spans : false,
				font_size_classes : 0,
				font_size_style_values : 0,
				apply_source_formatting : 0,
				indent_mode : 'simple',
				indent_char : '\t',
				indent_levels : 1
			}, s);

			t.dom = s.dom;
			t.setRules(s.valid_elements);
			t.addRules(s.extended_valid_elements);
			t.addValidChildRules(s.valid_child_elements);

			if (s.invalid_elements)
				t.invalidElementsRE = new RegExp('^(' + t.wildcardToRE(s.invalid_elements.replace(',', '|').toUpperCase()) + ')$');

			if (s.attrib_value_filter)
				t.attribValueFilter = s.attribValueFilter;

			if (s.fix_list_elements) {
				t.onPreProcess.add(function(o) {
					var nl, x, a = ['ol', 'ul'], i, n, p, r = /^(OL|UL)$/, np;

					function prevNode(e, n) {
						var a = n.split(','), i;

						while ((e = e.previousSibling) != null) {
							for (i=0; i<a.length; i++) {
								if (e.nodeName == a[i])
									return e;
							}
						}

						return null;
					};

					for (x=0; x<a.length; x++) {
						nl = o.node.getElementsByTagName(a[x]);

						for (i=0; i<nl.length; i++) {
							n = nl[i];
							p = n.parentNode;

							if (r.test(p.nodeName)) {
								np = prevNode(n, 'LI');

								if (!np) {
									np = t.dom.create('li');
									np.innerHTML = '&nbsp;';
									np.appendChild(n);
									p.insertBefore(np, p.firstChild);
								} else
									np.appendChild(n);
							}
						}
					}
				});
			}

			if (s.fix_table_elements) {
				t.onPreProcess.add(function(o) {
					var ta = [], d = t.dom.doc;

					// Build list of HTML chunks and replace tables with comment placeholders
					each(o.node.getElementsByTagName('table'), function(e) {
						var pa = t.dom.getParent(e, 'H1,H2,H3,H4,H5,H6,P'), p = [], i, h;

						if (pa) {
							t.dom.getParent(e, function(n) {
								if (n != e)
									p.push(n.nodeName);
							});

							h = '';

							for (i = 0; i < p.length; i++)
								h += '</' + p[i]+ '>';

							h += t.dom.getOuterHTML(e);

							for (i = p.length - 1; i >= 0; i--)
								h += '<' + p[i]+ '>';

							ta.push(h);
							e.parentNode.replaceChild(d.createComment('mcetable:' + (ta.length - 1)), e);
						}
					});

					// Replace table placeholders with end parents + table + start parents HTML code
					t.dom.setHTML(o.node, o.node.innerHTML.replace(/<!--mcetable:([0-9]+)-->/g, function(a, b) {
						return ta[parseInt(b)];
					}));
				});
			}
		},

		encode : function(o) {
			var t = this, s = t.settings, l;

			if (s.entity_encoding.indexOf('named') != -1) {
				t.setEntities(s.entities);
				l = t.entityLookup;

				if (o.format == 'html') {
					o.content = o.content.replace(t.entitiesRE, function(a) {
						var v;

						if (v = l[a])
							a = '&' + v + ';';

						return a;
					});
				}
			}

			if (s.entity_encoding.indexOf('numeric') != -1) {
				if (o.format == 'html') {
					o.content = o.content.replace(/[\u007E-\uFFFF]/g, function(a) {
						return '&#' + a.charCodeAt(0) + ';';
					});
				}
			}
		},

		setEntities : function(s) {
			var a, i, l = {}, re = '', v;

			// Build regex and lookup array
			a = s.split(',');
			for (i = 0; i < a.length; i += 2) {
				v = a[i];

				// Don't add default &amp; &quot; etc.
				if (v == 34 || v == 38 || v == 60 || v == 62)
					continue;

				l[String.fromCharCode(a[i])] = a[i + 1];

				v = parseInt(a[i]).toString(16);
				re += '\\u' + '0000'.substring(v.length) + v;
			}

			this.entitiesRE = new RegExp('[' + re + ']', 'g');
			this.entityLookup = l;
		},

		setValidChildRules : function(s) {
			this.childRules = null;
			this.addValidChildRules(s);
		},

		// h1/h2/h3/h4/h5/h6/a[%itrans_na],table[thead|tbody|tfoot|tr|td],strong/b/p/div/em/i/td[%itrans|#text],body[%btrans|#text]
		// div[a],h1[a]
		addValidChildRules : function(s) {
			var t = this, inst, intr, bloc;

			if (!s)
				return;

			inst = 'A|BR|SPAN|BDO|MAP|OBJECT|IMG|TT|I|B|BIG|SMALL|EM|STRONG|DFN|CODE|Q|SAMP|KBD|VAR|CITE|ABBR|ACRONYM|SUB|SUP|#text|#comment';
			intr = 'A|BR|SPAN|BDO|OBJECT|APPLET|IMG|MAP|IFRAME|TT|I|B|U|S|STRIKE|BIG|SMALL|FONT|BASEFONT|EM|STRONG|DFN|CODE|Q|SAMP|KBD|VAR|CITE|ABBR|ACRONYM|SUB|SUP|INPUT|SELECT|TEXTAREA|LABEL|BUTTON|#text|#comment';
			bloc = 'H[1-6]|P|DIV|ADDRESS|PRE|FORM|TABLE|LI|OL|UL|TD|CAPTION|BLOCKQUOTE|CENTER|DL|DT|DD|DIR|FIELDSET|FORM|NOSCRIPT|NOFRAMES|MENU|ISINDEX|SAMP';

			each(s.split(','), function(s) {
				var p = s.split(/\[|\]/), re;

				s = '';
				each(p[1].split('|'), function(v) {
					if (s)
						s += '|';

					switch (v) {
						case '%itrans':
							v = intr;
							break;

						case '%itrans_na':
							v = intr.substring(2);
							break;

						case '%istrict':
							v = inst;
							break;

						case '%istrict_na':
							v = inst.substring(2);
							break;

						case '%btrans':
							v = bloc;
							break;

						case '%bstrict':
							v = bloc;
							break;
					}

					s += v;
				});
				re = new RegExp('^(' + s.toLowerCase() + ')$', 'i');

				each(p[0].split('/'), function(s) {
					t.childRules = t.childRules || {};
					t.childRules[s] = re;
				});
			});

			// Build regex
			s = '';
			each(t.childRules, function(v, k) {
				if (s)
					s += '|';

				s += k;
			});

			t.parentElementsRE = new RegExp('^(' + s.toLowerCase() + ')$', 'i');

			/*console.debug(t.parentElementsRE.toString());
			each(t.childRules, function(v) {
				console.debug(v.toString());
			});*/
		},

		setRules : function(s) {
			var t = this;

			t.rules = {};
			t.wildRules = [];
			t.validElements = {};

			return t.addRules(s);
		},

		// a[href|target=_blank],-strong/-b,div[align],br,e*[a*|b*]
		addRules : function(s) {
			var t = this, dr;

			if (!s)
				return;

			each(s.split(','), function(s) {
				var p = s.split(/\[|\]/), tn = p[0].split('/'), ra, at, wat, va = [];

				// Extend with default rules
				if (dr)
					at = tinymce.extend([], dr.attribs);

				// Parse attributes
				if (p.length > 1) {
					each(p[1].split('|'), function(s) {
						var ar = {}, i;

						at = at || [];

						// Parse attribute rule
						s = s.replace(/::/g, '~');
						s = /^([!\-])?([\w*.?~]+|)([=:<])?(.+)?$/.exec(s);
						s[2] = s[2].replace(/~/g, ':');

						// Add required attributes
						if (s[1] == '!') {
							ra = ra || [];
							ra.push(s[2]);
						}

						// Remove inherited attributes
						if (s[1] == '-') {
							for (i = 0; i <at.length; i++) {
								if (at[i].name == s[2]) {
									at.splice(i, 1);
									return;
								}
							}
						}

						switch (s[3]) {
							// Add default attrib values
							case '=':
								ar.defaultVal = s[4] || '';
								break;

							// Add forced attrib values
							case ':':
								ar.forcedVal = s[4];
								break;

							// Add validation values
							case '<':
								ar.validVals = s[4].split('?');
								break;
						}

						if (/[*.?]/.test(s[2])) {
							wat = wat || [];
							ar.nameRE = new RegExp('^' + t.wildcardToRE(s[2]) + '$');
							wat.push(ar);
						} else {
							ar.name = s[2];
							at.push(ar);
						}

						va.push(s[2]);
					});
				}

				// Handle element names
				each(tn, function(s, i) {
					var pr = s.charAt(0), x = 1, ru = {};

					// Extend with default rule data
					if (dr) {
						if (dr.noEmpty)
							ru.noEmpty = dr.noEmpty;

						if (dr.fullEnd)
							ru.fullEnd = dr.fullEnd;

						if (dr.padd)
							ru.padd = dr.padd;
					}

					// Handle prefixes
					switch (pr) {
						case '-':
							ru.noEmpty = true;
							break;

						case '+':
							ru.fullEnd = true;
							break;

						case '#':
							ru.padd = true;
							break;

						default:
							x = 0;
					}

					tn[i] = s = s.substring(x);
					t.validElements[s] = 1;

					// Add element name or element regex
					if (/[*.?]/.test(tn[0])) {
						ru.nameRE = new RegExp('^' + t.wildcardToRE(tn[0]) + '$');
						t.wildRules = t.wildRules || {};
						t.wildRules.push(ru);
					} else {
						ru.name = tn[0];

						// Store away default rule
						if (tn[0] == '@')
							dr = ru;

						t.rules[s] = ru;
					}

					ru.attribs = at;

					if (ra)
						ru.requiredAttribs = ra;

					if (wat) {
						// Build valid attributes regexp
						s = '';
						each(va, function(v) {
							if (s)
								s += '|';

							s += '(' + t.wildcardToRE(v) + ')';
						});
						ru.validAttribsRE = new RegExp('^' + s.toLowerCase() + '$');
						ru.wildAttribs = wat;
					}
				});
			});

			// Build valid elements regexp
			s = '';
			each(t.validElements, function(v, k) {
				if (s)
					s += '|';

				if (k != '@')
				s += k;
			});
			t.validElementsRE = new RegExp('^(' + t.wildcardToRE(s.toUpperCase()) + ')$');

			//console.debug(t.validElementsRE.toString());
			//console.dir(t.rules);
			//console.dir(t.wildRules);
		},

		wildcardToRE : function(s) {
			return s.replace(/([?+*])/g, '.$1');
		},

		findRule : function(n) {
			var t = this, rl = t.rules, i, r;

			// Exact match
			r = rl[n];
			if (r)
				return r;

			// Try wildcards
			rl = t.wildRules;
			for (i = 0; i < rl.length; i++) {
				if (rl[i].nameRE.test(n))
					return rl[i];
			}

			return null;
		},

		findAttribRule : function(ru, n) {
			var i, wa = ru.wildAttribs;

			for (i = 0; i < wa.length; i++) {
				if (wa[i].nameRE.test(n))
					return wa[i];
			}

			return null;
		},

		getAttrib : function(n, a, na) {
			var i, v;

			na = na || a.name;

			if (a.forcedVal && (v = a.forcedVal)) {
				if (v === '{$uid}')
					return this.dom.uniqueId();

				return v;
			}

			v = this.dom.getAttrib(n, na);

			if (this.attribValueFilter)
				v = this.attribValueFilter(na, v, n);

			if (a.validVals) {
				for (i = a.validVals.length - 1; i >= 0; i--) {
					if (v == a.validVals[i])
						break;
				}

				if (i == -1)
					return null;
			}

			if (v === '' && typeof(a.defaultVal) != 'undefined') {
				v = a.defaultVal;

				if (v === '{$uid}')
					return this.dom.uniqueId();

				return v;
			} else {
				// Remove internal mceItemXX classes when content is extracted from editor
				if (na == 'class' && this.processObj.get)
					v = v.replace(/\bmceItem\w+\b/g, '');
			}

			if (v === '')
				return null;


			return v;
		},

		serializeNode : function(n, inn) {
			var t = this, s = t.settings, w = t.writer, hc, el, cn, i, l, a, at, no, v, nn, ru, ar, iv;

			if (!s.node_filter || s.node_filter(n)) {
				switch (n.nodeType) {
					case 1: // Element
						if (n.hasAttribute('mce_bogus'))
							return;

						iv = false;
						hc = n.hasChildNodes();

						// Check if valid
						if (!t.validElementsRE.test(n.nodeName) || (t.invalidElementsRE && t.invalidElementsRE.test(n.nodeName)) || inn) {
							iv = true;
							break;
						}

						nn = n.getAttribute('mce_name') || n.nodeName.toLowerCase();

						if (isIE) {
							// Fix IE content duplication (DOM can have multiple copies of the same node)
							if (s.fix_content_duplication) {
								if (n.mce_serialized == t.key)
									return;

								n.mce_serialized = t.key;
							}

							// IE sometimes adds a / infront of the node name
							if (nn.charAt(0) == '/')
								nn = nn.substring(1);

							// Add correct prefix
							if (n.scopeName !== 'HTML')
								nn = n.scopeName + ':' + nn;
						}

						// Remove mce prefix on IE needed for the abbr element
						if (nn.indexOf('mce:') === 0)
							nn = nn.substring(4);

						// Check if valid child
						if (t.childRules) {
							if (t.parentElementsRE.test(t.elementName)) {
								if (!t.childRules[t.elementName].test(nn)) {
									iv = true;
									break;
								}
							}

							t.elementName = nn;
						}

						ru = t.findRule(nn);
						nn = ru.name || nn;

						// Skip empty nodes or empty node name in IE
						if ((!hc && ru.noEmpty) || (isIE && !nn)) {
							iv = true;
							break;
						}

						// Check required
						if (ru.requiredAttribs) {
							a = ru.requiredAttribs;

							for (i = a.length - 1; i >= 0; i--) {
								if (this.dom.getAttrib(n, a[i]) !== '')
									break;
							}

							// None of the required was there
							if (i == -1) {
								iv = true;
								break;
							}
						}

						w.writeStartElement(nn);

						// Add ordered attributes
						if (ru.attribs) {
							for (i=0, at = ru.attribs, l = at.length; i<l; i++) {
								a = at[i];
								v = t.getAttrib(n, a);

								if (v !== null)
									w.writeAttribute(a.name, v);
							}
						}

						// Add wild attributes
						if (ru.validAttribsRE) {
							at = isIE ? getIEAtts(n) : n.attributes;
							for (i=at.length-1; i>-1; i--) {
								no = at[i];

								if (no.specified) {
									a = no.nodeName.toLowerCase();

									if (s.invalid_attrs.test(a) || !ru.validAttribsRE.test(a))
										continue;

									ar = t.findAttribRule(ru, a);
									v = t.getAttrib(n, ar, a);

									if (v !== null)
										w.writeAttribute(a, v);
								}
							}
						}

						// Padd empty nodes with a &nbsp;
						if (!hc && ru.padd)
							w.writeText('\u00a0');

						break;

					case 3: // Text
						// Check if valid child
						if (t.childRules && t.parentElementsRE.test(t.elementName)) {
							if (!t.childRules[t.elementName].test(n.nodeName))
								return;
						}

						return w.writeText(n.nodeValue);

					case 4: // CDATA
						return w.writeCDATA(n.nodeValue);

					case 8: // Comment
						return w.writeComment(n.nodeValue);
				}
			} else if (n.nodeType == 1)
				hc = n.hasChildNodes();

			if (hc) {
				cn = n.firstChild;

				while (cn) {
					t.serializeNode(cn);
					t.elementName = nn;
					cn = cn.nextSibling;
				}
			}

			// Write element end
			if (!iv) {
				if (hc || !s.closed.test(nn))
					w.writeFullEndElement();
				else
					w.writeEndElement();
			}
		},

		serialize : function(n, o) {
			var h, t = this;

			o = o || {};
			o.format = o.format || 'html';
			t.processObj = o;
			n = n.cloneNode(true);
			t.key = '' + (parseInt(t.key) + 1);

			// Pre process
			if (!o.no_events) {
				o.node = n;
				t.onPreProcess.dispatch(o);
			}

			// Serialize HTML DOM into a string
			t.writer.reset();
			t.serializeNode(n, o.getInner);

			// Post process
			o.content = t.writer.getContent();

			if (!o.no_events)
				t.onPostProcess.dispatch(o);

			t.encode(o);
			t.indentContent(o);
			t._postProcess(o);

			o.node = null;

			return tinymce.trim(o.content);
		},

		indentContent : function(o) {
			var t = this, s = t.settings, h, sc = [], p;

			// Simple intentation
			if (s.apply_source_formatting && s.indent_mode == 'simple' && o.format == 'html') {
				h = o.content;

				// Protect some elements
				p = t._protect({
					content : h,
					patterns : [
						/<script[^>]*>(.*?)<\/script>/g,
						/<style[^>]*>(.*?)<\/style>/g,
						/<pre[^>]*>(.*?)<\/pre>/g
					]
				});
				h = p.content;

				// Since Gecko and Safari keeps whitespace in the DOM we need to
				// remove it inorder to match other browsers. But I think Gecko and Safari is right.
				h = h.replace(/(<[^>]+>)\s+/g, '$1 ');
				h = h.replace(/\s+(<\/[^>]+>)/g, ' $1');
				h = h.replace(/<(p|h[1-6]|div|table|tbody|tr|td|body|head|html|title|meta|style|pre|script|link|object) ([^>]+)>\s+/g, '<$1 $2>'); // Trim block start
				h = h.replace(/<(p|h[1-6]|div|table|tbody|tr|td|body|head|html|title|meta|style|pre|script|link|object)>\s+/g, '<$1>'); // Trim block start
				h = h.replace(/\s+<\/(p|h[1-6]|div|table|tbody|tr|td|body|head|html|title|meta|style|pre|script|link|object)>/g, '</$1>'); // Trim block end
				h = t._unprotect(h, p);

				// Add line breaks before and after block elements
				h = h.replace(/\s*<(p|h[1-6]|div|table|tbody|tr|td|body|head|html|title|meta|style|pre|script|link|object) ([^>]+)>/g, '\n<$1 $2>');
				h = h.replace(/\s*<(p|h[1-6]|div|table|tbody|tr|td|body|head|html|title|meta|style|pre|script|link|object)>/g, '\n<$1>');
				h = h.replace(/<(object)([^>]*)>\s*/g, '<$1$2>\n');
				h = h.replace(/\s*<\/(tr|tbody|table|body|head|html|object)>/g, '\n</$1>');

				o.content = h;
			}
		},

		_protect : function(o) {
			o.items = o.items || [];

			function enc(s) {
				return s.replace(/[\r\n]/g, function(c) {
					if (c === '\n')
						return '\\n';

					return '\\r';
				});
			};

			function dec(s) {
				return s.replace(/\\[rn]/g, function(c) {
					if (c === '\\n')
						return '\n';

					return '\r';
				});
			};

			each(o.patterns, function(p) {
				o.content = dec(enc(o.content).replace(p, function(a) {
					o.items.push(dec(a));
					return '<!--mce:' + (o.items.length - 1) + '-->';
				}));
			});

			return o;
		},

		_unprotect : function(h, o) {
			h = h.replace(/\<!--mce:([0-9]+)--\>/g, function(a, b) {
				return o.items[parseInt(b)];
			});

			o.items = [];

			return h;
		},

		_postProcess : function(o) {
			var s = this.settings, h;

			if (o.format == 'html') {
				h = o.content;

				// Use BR instead of &nbsp; padded P elements inside editor and use <p>&nbsp;</p> outside editor
				if (o.set)
					h = h.replace(/<p>\s+(&nbsp;|&#160;|\u00a0|<br \/>)\s+<\/p>/g, '<p><br /></p>');
				else
					h = h.replace(/<p>\s+(&nbsp;|&#160;|\u00a0|<br \/>)\s+<\/p>/g, '<p>$1</p>');

				o.content = h;
			}
		}
	});
})();

/* file:jscripts/tiny_mce/classes/dom/ScriptLoader.js */

(function() {
	var each = tinymce.each;

	tinymce.create('tinymce.dom.ScriptLoader', {
		ScriptLoader : function(s) {
			this.settings = s || {};
			this.que = [];
			this.lookup = {};
		},

		prepend : function(u, cb, s) {
			this.add(u, cb, s, 1);
		},

		add : function(u, cb, s, pr) {
			var t = this, lo = t.lookup, o;

			if (o = lo[u]) {
				// Is loaded fire callback
				if (cb && o.state == 2)
					cb.call(s || this);

				return o;
			}

			o = {state : 0, url : u, func : cb, scope : s || this};

			if (pr)
				t.que.unshift(o);
			else
				t.que.push(o);

			lo[u] = o;

			return o;
		},

		load : function(u, cb, s) {
			var o;

			if (!tinymce.is(u, 'string')) {
				o = [];

				each(u, function(u) {
					o.push({state : 0, url : u});
				});

				this.loadScripts(o, cb, s);
			} else
				this.loadScripts([{state : 0, url : u}], cb, s);
		},

		loadQue : function(cb, s) {
			var t = this;

			if (!t.queLoading) {
				t.queLoading = 1;
				t.queCallbacks = [];

				t.loadScripts(t.que, function() {
					t.queLoading = 0;

					if (cb)
						cb.call(s || t);

					each(t.queCallbacks, function(o) {
						o.func.call(o.scope);
					});
				});
			} else if (cb)
				t.queCallbacks.push({func : cb, scope : s || t});
		},

		eval : function(co) {
			var w = window;

			// Evaluate script
			if (!w.execScript) {
				try {
					eval.call(w, co);
				} catch (ex) {
					eval(co, w); // Firefox 3.0a8
				}
			} else
				w.execScript(co); // IE
		},

		loadScripts : function(sc, cb, s) {
			var t = this, lo = t.lookup;

			function done(o) {
				o.state = 2; // Has been loaded

				// Run callback
				if (o.func)
					o.func.call(o.scope || t);
			};

			function allDone() {
				var l;

				// Check if all files are loaded
				l = sc.length;
				each(sc, function(o) {
					o = lo[o.url];

					if (o.state === 2) {// It has finished loading
						done(o);
						l--;
					} else
						load(o);
				});

				// They are all loaded
				if (l === 0 && cb) {
					cb.call(s || t);
					cb = 0;
				}
			};

			function load(o) {
				if (o.state > 0)
					return;

				o.state = 1; // Is loading

				tinymce.util.XHR.send({
					url : o.url,
					content_type : 'text/javascript',
					error : t.settings.error,
					success : function(co) {
						t.eval(co);
						done(o);
						allDone();
					}
				});
			};

			each(sc, function(o) {
				var u = o.url;

				// Add to que if needed
				if (!lo[u]) {
					lo[u] = o;
					t.que.push(o);
				} else
					o = lo[u];

				// Is already loading or has been loaded
				if (o.state > 0)
					return;

				if (!tinymce.dom.Event.domLoaded && !t.settings.strict_mode) {
					var ix, ol = '';

					// Add onload events
					if (cb || o.func) {
						o.state = 1; // Is loading

						ix = tinymce.dom.ScriptLoader._addOnLoad(function() {
							done(o);
							allDone();
						});

						if (tinymce.isIE)
							ol = ' onreadystatechange="';
						else
							ol = ' onload="';

						ol += 'tinymce.dom.ScriptLoader._onLoad(this,\'' + u + '\',' + ix + ');"';
					}

					document.write('<script type="text/javascript" src="' + u + '"' + ol + '></script>');

					if (!o.func)
						done(o);
				} else
					load(o);
			});

			allDone();
		},

		// Static methods
		'static' : {
			_addOnLoad : function(f) {
				var t = this;

				t._funcs = t._funcs || [];
				t._funcs.push(f);

				return t._funcs.length - 1;
			},

			_onLoad : function(e, u, ix) {
				if (!tinymce.isIE || e.readyState == 'complete')
					this._funcs[ix].call(this);
			}
		}
	});

	// Global script loader
	tinymce.ScriptLoader = new tinymce.dom.ScriptLoader();
})();

/*
	tinymce.ScriptLoader.add('test1.js');
	tinymce.ScriptLoader.add('test2.js');
	tinymce.ScriptLoader.add('test3.js');
	tinymce.ScriptLoader.loadQue(function() {
		alert('Loaded!!');
	});

	tinymce.ScriptLoader = new tinymce.compressor.ScriptLoader();
*/
/* file:jscripts/tiny_mce/classes/ui/Control.js */

(function() {
	var DOM = tinymce.DOM, is = tinymce.is;

	tinymce.create('tinymce.ui.Control', {
		Control : function(id, s) {
			this.id = id;
			this.settings = s = s || {};
			this.rendered = false;
			this.onRender = new tinymce.util.Dispatcher(this);
			this.classPrefix = '';
			this.scope = s.scope || this;
		},

		setDisabled : function(s) {
			if (s != this.disabled) {
				this.setState('Disabled', s);
				this.setState('Enabled', !s);
				this.disabled = s;
			}
		},

		isDisabled : function() {
			return this.disabled;
		},

		setActive : function(s) {
			if (s != this.active) {
				this.setState('Active', s);
				this.active = s;
			}
		},

		isActive : function() {
			return this.active;
		},

		setState : function(c, s) {
			var n = DOM.get(this.id);

			c = this.classPrefix + c;

			if (s)
				DOM.addClass(n, c);
			else
				DOM.removeClass(n, c);
		},

		isRendered : function() {
			return this.rendered;
		},

		renderHTML : function() {
		},

		renderTo : function(n) {
			n.innerHTML = this.renderHTML();
		},

		postRender : function() {
			var t = this, b;

			// Set pending states
			if (is(t.disabled)) {
				b = t.disabled;
				t.disabled = -1;
				t.setDisabled(b);
			}

			if (is(t.active)) {
				b = t.active;
				t.active = -1;
				t.setActive(b);
			}
		},

		destroy : function() {
			DOM.remove(this.id);
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/Container.js */

(function() {
	tinymce.create('tinymce.ui.Container:tinymce.ui.Control', {
		Container : function(id, s) {
			this.parent(id, s);
			this.controls = [];
			this.lookup = {};
		},

		add : function(c) {
			this.lookup[c.id] = c;
			this.controls.push(c);
		},

		remove : function(c) {
		},

		getControls : function() {
			return this.controls;
		},

		get : function(n) {
			return this.lookup[n];
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ui/Separator.js */

(function() {
	var DOM = tinymce.DOM;

	tinymce.create('tinymce.ui.Separator:tinymce.ui.Control', {
		renderHTML : function() {
			return DOM.createHTML('span', {'class' : 'mceSeparator'});
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/MenuItem.js */

(function() {
	var is = tinymce.is, DOM = tinymce.DOM, each = tinymce.each, walk = tinymce.walk;

	tinymce.create('tinymce.ui.MenuItem:tinymce.ui.Control', {
		MenuItem : function(id, s) {
			this.parent(id, s);
			this.classPrefix = 'mceMenuItem';
		},

		setSelected : function(s) {
			this.setState('Selected', s);
			this.selected = s;
		},

		isSelected : function() {
			return this.selected;
		},

		postRender : function() {
			var t = this;
			
			t.parent();

			// Set pending state
			if (is(t.selected))
				t.setSelected(t.selected);
		},

		execCallback : function() {
			var s = this.settings;

			if (s.func)
				return s.func.apply(s.scope, arguments);
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ui/Menu.js */

(function() {
	var is = tinymce.is, DOM = tinymce.DOM, each = tinymce.each, walk = tinymce.walk;

	tinymce.create('tinymce.ui.Menu:tinymce.ui.MenuItem', {
		Menu : function(id, s) {
			var t = this;

			t.parent(id, s);
			t.items = {};
			t.collapsed = false;
			t.menuCount = 0;
			t.onAddItem = new tinymce.util.Dispatcher(this);
		},

		expand : function(d) {
			var t = this;

			if (d) {
				walk(t, 'items', function(o) {
					if (o.expand)
						o.expand();
				}, t);
			}

			t.collapsed = false;
		},

		collapse : function(d) {
			var t = this;

			if (d) {
				walk(t, 'items', function(o) {
					if (o.collapse)
						o.collapse();
				}, t);
			}

			t.collapsed = true;
		},

		isCollapsed : function() {
			return this.collapsed;
		},

		add : function(o) {
			if (!o.settings)
				o = new tinymce.ui.MenuItem(o.id || DOM.uniqueId(), o);

			this.onAddItem.dispatch(o);

			return this.items[o.id] = o;
		},

		addSeparator : function() {
			return this.add({separator : true});
		},

		addMenu : function(o) {
			if (!o.collapse)
				o = this.createMenu(o);

			this.menuCount++;

			return this.add(o);
		},

		hasMenus : function() {
			return this.menuCount !== 0;
		},

		remove : function(o) {
			delete this.items[o.id];
		},

		removeAll : function() {
			var t = this;

			walk(t, 'items', function(o) {
				if (o.removeAll)
					o.removeAll();

				o.destroy();
			}, t);

			t.items = {};
		},

		createMenu : function(o) {
			var m = new tinymce.ui.Menu(o.id || DOM.uniqueId(), o);

			m.onAddItem.add(this.onAddItem.dispatch, this.onAddItem);

			return m;
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/DropMenu.js */

(function() {
	var is = tinymce.is, DOM = tinymce.DOM, each = tinymce.each, Event = tinymce.dom.Event, Element = tinymce.dom.Element;

	tinymce.create('tinymce.ui.DropMenu:tinymce.ui.Menu', {
		DropMenu : function(id, s) {
			s = s || {};
			s.container = s.container || document.body;
			s.offset_x = s.offset_x || 0;
			s.offset_y = s.offset_y || 0;
			s.vp_offset_x = s.vp_offset_x || 0;
			s.vp_offset_y = s.vp_offset_y || 0;
			this.parent(id, s);
			this.onHideMenu = new tinymce.util.Dispatcher(this);
			this.classPrefix = 'mceMenu';
		},

		createMenu : function(s) {
			var cs = this.settings, m;

			s.container = s.container || cs.container;
			s.parent = this;
			s.vp_offset_x = s.vp_offset_x || cs.vp_offset_x;
			s.vp_offset_y = s.vp_offset_y || cs.vp_offset_y;
			m = new tinymce.ui.DropMenu(s.id || DOM.uniqueId(), s);

			m.onAddItem.add(this.onAddItem.dispatch, this.onAddItem);

			return m;
		},

		update : function() {
			var t = this, s = t.settings, tb = DOM.get('menu_' + t.id + '_tbl'), co = DOM.get('menu_' + t.id);

			if (!DOM.boxModel)
				t.element.setStyles({width : tb.clientWidth + 2, height : tb.clientHeight + 2});
			else
				t.element.setStyles({width : tb.clientWidth, height : tb.clientHeight});

			if (s.max_width)
				DOM.setStyle(co, 'width', Math.min(tb.clientWidth, s.max_width));

			if (s.max_height) {
				DOM.setStyle(co, 'height', Math.min(tb.clientHeight, s.max_height));

				if (tb.clientHeight < s.max_height)
					DOM.setStyle(co, 'overflow', 'hidden');
			}
		},

		showMenu : function(x, y, px) {
			var t = this, s = t.settings, co, vp = DOM.getViewPort(), w, h, mx, my, ot, dm, tb;

			t.collapse(1);

			if (t.isMenuVisible)
				return;

			if (!t.rendered) {
				co = DOM.add(t.settings.container, t.renderNode());

				each(t.items, function(o) {
					o.postRender();
				});

				t.element = new Element('menu_' + t.id, {blocker : 1, container : s.container});
			} else
				co = DOM.get('menu_' + t.id);

			DOM.setStyles(co, {left : -0xFFFF , top : -0xFFFF});
			DOM.show(co);
			t.update();

			x += s.offset_x;
			y += s.offset_y;
			vp.w -= 20;
			vp.h -= 20;

			// Move inside viewport if not submenu
			ot = 2;
			w = co.clientWidth - ot;
			h = co.clientHeight - ot;
			mx = vp.x + vp.w;
			my = vp.y + vp.h;

			if ((x + s.vp_offset_x + w) > mx)
				x = px ? px - w : Math.max(0, (mx - s.vp_offset_x) - w);

			if ((y + s.vp_offset_y + h) > my)
				y = Math.max(0, (my - s.vp_offset_y) - h);

			DOM.setStyles(co, {left : x , top : y});
			t.element.update();

			t.isMenuVisible = 1;
			t.mouseClickFunc = Event.add(co, 'click', function(e) {
				var m;

				e = e.target;

				if (e && (e = DOM.getParent(e, 'TD'))) {
					m = t.items[e.id];

					if (m.isDisabled())
						return;

					m.execCallback();
					dm = t;

					while (dm) {
						if (dm.hideMenu)
							dm.hideMenu();

						dm = dm.settings.parent;
					}
				}
			});

			if (t.hasMenus()) {
				t.mouseOverFunc = Event.add(co, 'mouseover', function(e) {
					var m, r, mi, p;

					e = e.target;
					if (e && (e = DOM.getParent(e, 'TD'))) {
						m = t.items[e.id];

						if (t.lastMenu)
							t.lastMenu.collapse(1);

						if (m.isDisabled())
							return;

						if (e && DOM.hasClass(e, 'mceMenuItemSub')) {
							p = DOM.getPos(s.container);
							r = DOM.getRect(e);
							m.showMenu((r.x + r.w - ot) - p.x, r.y - ot - p.y, r.x);
							t.lastMenu = m;
							DOM.addClass(DOM.get(m.id).firstChild, 'mceMenuItemActive');
						}
					}
				});
			}
		},

		hideMenu : function() {
			var t = this, co = DOM.get('menu_' + t.id), e;

			if (!t.isMenuVisible)
				return;

			Event.remove(co, 'mouseover', t.mouseOverFunc);
			Event.remove(co, 'click', t.mouseClickFunc);
			DOM.hide(co);
			t.isMenuVisible = 0;

			if (t.element)
				t.element.hide();

			if (e = DOM.get(t.id))
				DOM.removeClass(e.firstChild, 'mceMenuItemActive');

			t.onHideMenu.dispatch(t);
		},

		add : function(o) {
			var t = this, co;

			o = t.parent(o);

			if (t.isRendered && (co = DOM.get('menu_' + t.id)))
				t._add(DOM.select('tbody', co)[0], o);

			return o;
		},

		collapse : function(d) {
			this.parent(d);
			this.hideMenu();
		},

		destroy : function() {
			var t = this, co = DOM.get('menu_' + t.id);

			Event.remove(co, 'mouseover', t.mouseOverFunc);
			Event.remove(co, 'click', t.mouseClickFunc);

			if (t.element)
				t.element.remove();

			DOM.remove(co);
		},

		remove : function(o) {
			DOM.remove(o.id);

			return this.parent(o);
		},

		_add : function(tb, o) {
			var n, s = o.settings, a, ro, it;

			if (s.separator) {
				ro = DOM.add(tb, 'tr', {'class' : 'mceMenuItemSeparator'});
				DOM.add(ro, 'td', {id : o.id, 'class' : 'mceMenuItemSeparator'});

				if (n = ro.previousSibling)
					DOM.addClass(n, 'last');

				return;
			}

			n = ro = DOM.add(tb, 'tr');
			n = it = DOM.add(n, 'td', {id : o.id, 'class' : 'mceMenuItem mceMenuItemEnabled'});
			n = a = DOM.add(n, 'a', {href : 'javascript:;', onmousedown : 'return false;'});

			DOM.addClass(it, s['class']);
//			n = DOM.add(n, 'span', {'class' : 'item'});
			DOM.add(n, 'span', {'class' : 'icon' + (s.icon ? ' ' + s.icon : '')});
			n = DOM.add(n, s.element || 'span', {'class' : 'text', title : o.settings.title}, o.settings.title);

			if (o.settings.style)
				DOM.setAttrib(n, 'style', o.settings.style);

			if (tb.childNodes.length == 1)
				DOM.addClass(ro, 'first');

			if ((n = ro.previousSibling) && DOM.hasClass(n, 'mceMenuItemSeparator'))
				DOM.addClass(ro, 'first');

			if (o.collapse)
				DOM.addClass(it, 'mceMenuItemSub');

			if (n = ro.previousSibling)
				DOM.removeClass(n, 'last');

			DOM.addClass(ro, 'last');
		},

		renderNode : function() {
			var t = this, s = t.settings, n, tb, co;

			co = DOM.create('div', {id : 'menu_' + t.id, 'class' : 'mceMenu' + (s['class'] ? ' ' + s['class'] : '')});
			t.element = new Element('menu_' + t.id, {blocker : 1, container : s.container});

			if (s.menu_line)
				DOM.add(co, 'span', {'class' : 'mceMenuLine'});

//			n = DOM.add(co, 'div', {id : 'menu_' + t.id + '_co', 'class' : 'mceMenuContainer'});
			n = DOM.add(co, 'table', {id : 'menu_' + t.id + '_tbl', border : 0, cellPadding : 0, cellSpacing : 0});
			tb = DOM.add(n, 'tbody');

			each(t.items, function(o) {
				t._add(tb, o);
			});

			t.rendered = true;

			return co;
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/Button.js */

(function() {
	var DOM = tinymce.DOM;

	tinymce.create('tinymce.ui.Button:tinymce.ui.Control', {
		Button : function(id, s) {
			this.parent(id, s);
			this.classPrefix = 'mceButton';
		},

		renderHTML : function() {
			var s = this.settings;

			if (s.image)
				return '<a id="' + this.id + '" href="javascript:;" class="mceButton mceButtonEnabled ' + s['class'] + '" onmousedown="return false;" title="' + DOM.encode(s.title) + '"><img class="icon" src="' + s.image + '" /></a>';

			return '<a id="' + this.id + '" href="javascript:;" class="mceButton mceButtonEnabled ' + s['class'] + '" onmousedown="return false;" title="' + DOM.encode(s.title) + '"><span class="icon ' + s['class'] + '"></span></a>';
		},

		postRender : function() {
			var t = this, s = t.settings;

			tinymce.dom.Event.add(t.id, 'click', function(e) {
				if (!t.isDisabled())
					return s.func.call(s.scope, e);
			});
		},

		execCallback : function() {
			var s = this.settings;

			return s.func.apply(s.scope, arguments);
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ui/ListBox.js */

(function() {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, each = tinymce.each, Dispatcher = tinymce.util.Dispatcher;

	tinymce.create('tinymce.ui.ListBox:tinymce.ui.Control', {
		ListBox : function(id, s) {
			var t = this;

			t.parent(id, s);
			t.items = [];
			t.onChange = new Dispatcher(t);
			t.onPostRender = new Dispatcher(t);
			t.onAdd = new Dispatcher(t);
			t.onRenderMenu = new tinymce.util.Dispatcher(this);
			t.classPrefix = 'mceListBox';
		},

		select : function(v) {
			var t = this;

			if (v != t.selectedValue) {
				t.selectedValue = v;

				if (!v) {
					DOM.setHTML(t.id + '_text', DOM.encode(t.settings.title));
					DOM.addClass(t.id + '_text', 'title');
					return;
				}

				DOM.removeClass(t.id + '_text', 'title');

				each(t.items, function(o) {
					if (o.value === v)
						DOM.setHTML(t.id + '_text', DOM.encode(o.title));
				});
			}
		},

		add : function(n, v, o) {
			var t = this;

			o = o || {};
			o = tinymce.extend(o, {
				title : n,
				value : v
			});

			t.items.push(o);
			t.onAdd.dispatch(o);
		},

		getLength : function() {
			return Math.max(this.items.length - 1, 0);
		},

		renderHTML : function() {
			var h = '', t = this, s = t.settings;

			h = '<table id="' + t.id + '" cellpadding="0" cellspacing="0" class="mceListBox mceListBoxEnabled' + (s['class'] ? (' ' + s['class']) : '') + '"><tbody><tr>';
			h += '<td>' + DOM.createHTML('a', {id : t.id + '_text', href : 'javascript:;', 'class' : 'text', onmousedown : 'return false;'}, DOM.encode(t.settings.title)) + '</td>';
			h += '<td>' + DOM.createHTML('a', {id : t.id + '_open', href : 'javascript:;', 'class' : 'open', onmousedown : 'return false;'}, '<span></span>') + '</td>';
			h += '</tr></tbody></table>';

			return h;
		},

		showMenu : function() {
			var t = this, p1, p2, e = DOM.get(this.id), m;

			if (t.isDisabled() || t.items.length == 0)
				return;

			if (!t.isMenuRendered) {
				t.renderMenu();
				t.isMenuRendered = true;
			}

			p1 = DOM.getPos(this.settings.menu_container);
			p2 = DOM.getPos(e);

			m = t.menu;
			m.settings.offset_x = p2.x - p1.x;
			m.settings.offset_y = p2.y - p1.y;

			// Select in menu
			if (t.oldID)
				m.items[t.oldID].setSelected(0);

			each(t.items, function(o) {
				if (o.value === t.selectedValue) {
					m.items[o.id].setSelected(1);
					t.oldID = o.id;
				}
			});

			m.showMenu(0, e.clientHeight);

			Event.add(document, 'mousedown', t.hideMenu, t);
			DOM.addClass(t.id, 'mceListBoxSelected');
		},

		hideMenu : function(e) {
			var t = this;

			if (!e || !DOM.getParent(e.target, function(n) {return DOM.hasClass(n, 'mceMenu');})) {
				DOM.removeClass(t.id, 'mceListBoxSelected');
				Event.remove(document, 'mousedown', t.hideMenu, t);

				if (t.menu)
					t.menu.hideMenu();
			}
		},

		renderMenu : function() {
			var t = this, m;

			m = t.settings.control_manager.createDropMenu(t.id + '_menu', {
				menu_line : 1,
				'class' : 'mceListBoxMenu noIcons',
				max_width : 150,
				max_height : 150
			});

			m.onHideMenu.add(t.hideMenu, t);

			m.add({
				title : t.settings.title,
				'class' : 'mceMenuItemTitle'
			}).setDisabled(1);

			each(t.items, function(o) {
				o.id = DOM.uniqueId();
				o.func = function() {
					t.execCallback(o.value);
					t.select(o.value); // Must be runned after
				};

				m.add(o);
			});

			t.onRenderMenu.dispatch(m);
			t.menu = m;
		},

		postRender : function() {
			var t = this;

			Event.add(t.id, 'click', t.showMenu, t);

			// Old IE doesn't have hover on all elements
			if (tinymce.isIE6 || !DOM.boxModel) {
				Event.add(t.id, 'mouseover', function() {
					if (!DOM.hasClass(t.id, 'mceListBoxDisabled'))
						DOM.addClass(t.id, 'mceListBoxHover');
				});

				Event.add(t.id, 'mouseout', function() {
					if (!DOM.hasClass(t.id, 'mceListBoxDisabled'))
						DOM.removeClass(t.id, 'mceListBoxHover');
				});
			}

			t.onPostRender.dispatch(DOM.get(t.id));
		},

		execCallback : function() {
			var s = this.settings;

			if (s.func)
				return s.func.apply(s.scope, arguments);
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/NativeListBox.js */

(function() {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, each = tinymce.each, Dispatcher = tinymce.util.Dispatcher;

	tinymce.create('tinymce.ui.NativeListBox:tinymce.ui.ListBox', {
		NativeListBox : function(id, s) {
			this.parent(id, s);
			this.classPrefix = 'mceNativeListBox';
		},

		setDisabled : function(s) {
			DOM.get(this.id).disabled = s;
		},

		isDisabled : function() {
			return DOM.get(this.id).disabled;
		},

		select : function(v) {
			var e = DOM.get(this.id), ol = e.options;

			v = '' + (v || '');

			e.selectedIndex = 0;
			each(ol, function(o, i) {
				if (o.value == v) {
					e.selectedIndex = i;
					return false;
				}
			});
		},

		add : function(n, v, a) {
			var o, t = this;

			a = a || {};
			a.value = v;

			if (t.isRendered())
				DOM.add(DOM.get(this.id), 'option', a, n);

			o = {
				title : n,
				value : v,
				attribs : a
			};

			t.items.push(o);
			t.onAdd.dispatch(o);
		},

		getLength : function() {
			return DOM.get(this.id).options.length - 1;
		},

		renderHTML : function() {
			var h, t = this;

			h = DOM.createHTML('option', {value : ''}, '-- ' + t.settings.title + ' --');

			each(t.items, function(it) {
				h += DOM.createHTML('option', {value : it.value}, it.title);
			});

			h = DOM.createHTML('select', {id : t.id, 'class' : 'mceNativeListBox'}, h);

			return h;
		},

		postRender : function() {
			var t = this;

			t.rendered = true;

			Event.add(t.id, 'change', function(e) {
				var v = e.target.options[e.target.selectedIndex].value;

				t.onChange.dispatch(v);
				t.execCallback(v);
			});

			t.onPostRender.dispatch(DOM.get(t.id));
		},

		execCallback : function() {
			var s = this.settings;

			if (s.func)
				return s.func.apply(s.scope, arguments);
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ui/SplitButton.js */

(function() {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, each = tinymce.each;

	tinymce.create('tinymce.ui.SplitButton:tinymce.ui.Button', {
		SplitButton : function(id, s) {
			this.parent(id, s);
			this.classPrefix = 'mceSplitButton';
			this.onRenderMenu = new tinymce.util.Dispatcher(this);
			s.menu_container = s.menu_container || document.body;
		},

		showMenu : function() {
			var t = this, p1, p2, e = DOM.get(this.id), m;

			if (t.isDisabled())
				return;

			if (!t.isMenuRendered) {
				t.renderMenu();
				t.isMenuRendered = true;
			}

			p1 = DOM.getPos(this.settings.menu_container);
			p2 = DOM.getPos(e);

			m = t.menu;
			m.settings.offset_x = p2.x - p1.x;
			m.settings.offset_y = p2.y - p1.y;
			m.settings.vp_offset_x = p2.x;
			m.settings.vp_offset_y = p2.y;
			m.showMenu(0, e.clientHeight);

			Event.add(document, 'mousedown', t.hideMenu, t);
			DOM.addClass(t.id, 'mceSplitButtonSelected');
		},

		renderMenu : function() {
			var t = this, m;

			m = t.settings.control_manager.createDropMenu(t.id + '_menu', {
				menu_line : 1,
				'class' : 'mceSplitButtonMenu'
			});

			m.onHideMenu.add(t.hideMenu, t);

			t.onRenderMenu.dispatch(m);
			t.menu = m;
		},

		hideMenu : function(e) {
			var t = this;

			if (!e || !DOM.getParent(e.target, function(n) {return DOM.hasClass(n, 'mceMenu');})) {
				DOM.removeClass(t.id, 'mceSplitButtonSelected');
				Event.remove(document, 'mousedown', t.hideMenu, t);
				if (t.menu)
					t.menu.hideMenu();
			}
		},

		renderHTML : function() {
			var h, t = this, s = t.settings, h1;

			h = '<tbody><tr>';

			if (s.image)
				h1 = DOM.createHTML('img ', {src : s.image, 'class' : 'action ' + s['class']});
			else
				h1 = DOM.createHTML('span', {'class' : 'action ' + s['class']});

			h += '<td>' + DOM.createHTML('a', {id : t.id + '_action', href : 'javascript:;', 'class' : 'action ' + s['class'], onmousedown : 'return false;', title : s.title}, h1) + '</td>';
	
			h1 = DOM.createHTML('span', {'class' : 'open ' + s['class']});
			h += '<td>' + DOM.createHTML('a', {id : t.id + '_open', href : 'javascript:;', 'class' : 'open ' + s['class'], onmousedown : 'return false;', title : s.title}, h1) + '</td>';

			h += '</tr></tbody>';

			return DOM.createHTML('table', {id : t.id, 'class' : 'mceSplitButton mceSplitButtonEnabled ' + s['class'], cellpadding : '0', cellspacing : '0', onmousedown : 'return false;', title : s.title}, h);
		},

		postRender : function() {
			var t = this, s = t.settings;

			if (s.func) {
				Event.add(t.id + '_action', 'click', function() {
					if (!t.isDisabled())
						t.execCallback();
				});
			}

			if (s.func)
				Event.add(t.id + '_open', 'click', t.showMenu, t);

			// Old IE doesn't have hover on all elements
			if (tinymce.isIE6 || !DOM.boxModel) {
				Event.add(t.id, 'mouseover', function() {
					if (!DOM.hasClass(t.id, 'mceSplitButtonDisabled'))
						DOM.addClass(t.id, 'mceSplitButtonHover');
				});

				Event.add(t.id, 'mouseout', function() {
					if (!DOM.hasClass(t.id, 'mceSplitButtonDisabled'))
						DOM.removeClass(t.id, 'mceSplitButtonHover');
				});
			}
		},

		execCallback : function(v, a) {
			var s = this.settings;

			this.hideMenu();
			return s.func.call(s.scope || this, v || this.value, a);
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ui/ColorSplitButton.js */

(function() {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, is = tinymce.is, each = tinymce.each;

	tinymce.create('tinymce.ui.ColorSplitButton:tinymce.ui.SplitButton', {
		ColorSplitButton : function(id, s) {
			var t = this;

			t.parent(id, s);

			t.settings = s = tinymce.extend({
				colors : '000000,993300,333300,003300,003366,000080,333399,333333,800000,FF6600,808000,008000,008080,0000FF,666699,808080,FF0000,FF9900,99CC00,339966,33CCCC,3366FF,800080,999999,FF00FF,FFCC00,FFFF00,00FF00,00FFFF,00CCFF,993366,C0C0C0,FF99CC,FFCC99,FFFF99,CCFFCC,CCFFFF,99CCFF,CC99FF,FFFFFF',
				grid_width : 8,
				default_color : '#888888'
			}, t.settings);

			t.value = s.default_color;
		},

		showMenu : function() {
			var t = this, r, p;

			if (t.isDisabled())
				return;

			if (!t.isMenuRendered) {
				t.renderMenu();
				t.isMenuRendered = true;
			}

			DOM.show(t.id + '_menu');
			DOM.addClass(t.id, 'mceSplitButtonSelected');
			p = DOM.getPos(this.settings.menu_container);
			p2 = DOM.getPos(this.id);
			DOM.setStyles(t.id + '_menu', {
				left : p2.x - p.x,
				top : (p2.y + DOM.get(this.id).clientHeight) - p.y
			});

			Event.add(document, 'mousedown', t.hideMenu, t);
		},

		hideMenu : function(e) {
			var t = this;

			if (!e || !DOM.getParent(e.target, function(n) {return DOM.hasClass(n, 'mceSplitButtonMenu');})) {
				DOM.removeClass(t.id, 'mceSplitButtonSelected');
				Event.remove(document, 'mousedown', t.hideMenu, t);
				DOM.hide(t.id + '_menu');
			}
		},

		renderMenu : function() {
			var t = this, m, i = 0, s = t.settings, n, tb, tr;

			m = DOM.add(this.settings.menu_container, 'div', {id : this.id + '_menu', 'class' : 'mceSplitButtonMenu'});
			DOM.add(m, 'span', {'class' : 'mceMenuLine'});

			n = DOM.add(m, 'table', {'class' : 'mceColorSplitMenu'});
			tb = DOM.add(n, 'tbody');

			// Generate color grid
			i = 0;
			each(is(s.colors, 'array') ? s.colors : s.colors.split(','), function(c) {
				c = c.replace(/^#/, '');

				if (!i--) {
					tr = DOM.add(tb, 'tr');
					i = s.grid_width - 1;
				}

				n = DOM.add(tr, 'td');

				n = DOM.add(n, 'a', {
					href : 'javascript:;',
					style : {
						backgroundColor : '#' + c
					}
				});

				Event.add(n, 'mousedown', function() {
					t.setColor('#' + c);
				});
			});

			if (s.more_colors_func) {
				n = DOM.add(tb, 'tr');
				n = DOM.add(n, 'td', {colSpan : s.grid_width, 'class' : 'morecolors'});
				n = DOM.add(n, 'a', {href : 'javascript:;', 'class' : 'morecolors'}, 'More colors');

				Event.add(n, 'mousedown', function() {
					s.more_colors_func.call(s.more_colors_scope || this);
				});
			}

			DOM.addClass(m, 'mceColorSplitMenu');

			return m;
		},

		setColor : function(c) {
			var t = this, p, co = this.settings.menu_container, po, cp, id = t.id + '_preview';

			if (!(p = DOM.get(id))) {
				DOM.setStyle(this.id + '_action', 'position', 'relative');
				p = DOM.add(this.id + '_action', 'div', {id : id, 'class' : 'mceColorPreview'});
			}

			p.style.backgroundColor = c;

			t.value = c;
			t.hideMenu();
			t.execCallback(c, 'select');
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ui/Toolbar.js */

(function() {
	var each = tinymce.each, DOM = tinymce.DOM;

	tinymce.create('tinymce.ui.Toolbar:tinymce.ui.Container', {
		renderHTML : function() {
			var h = '', c = 'mceToolbarEnd', co;

			h += DOM.createHTML('td', {'class' : 'mceToolbarStart'}, DOM.createHTML('span', null, '<!-- IE -->'));

			each(this.controls, function(c) {
				h += '<td>' + c.renderHTML() + '</td>';
			});

			co = this.controls[this.controls.length - 1].constructor;

			if (co === tinymce.ui.Button)
				c += ' mceToolbarEndButton';
			else if (co === tinymce.ui.SplitButton)
				c += ' mceToolbarEndSplitButton';
			else if (co === tinymce.ui.ListBox)
				c += ' mceToolbarEndListBox';

			h += DOM.createHTML('td', {'class' : c}, DOM.createHTML('span', null, '<!-- IE -->'));

			return DOM.createHTML('table', {'class' : 'mceToolbar', cellpadding : '0', cellspacing : '0', align : this.settings.align}, '<tbody><tr>' + h + '</tr></tbody>');
		}
	});
})();

/* file:jscripts/tiny_mce/classes/Theme.js */

tinymce.create('tinymce.Theme', {
	Theme : function(ed) {
	}
});

/* file:jscripts/tiny_mce/classes/ThemeManager.js */

(function() {
	var Dispatcher = tinymce.util.Dispatcher, each = tinymce.each;

	tinymce.create('static tinymce.ThemeManager', {
		themes : [],
		themeURLs : {},
		lookup : {},

		get : function(n) {
			return this.lookup[n];
		},

		requireLangPack : function(n) {
			var u, s;

			if (tinymce.EditorManager.settings) {
				u = this.themeURLs[n] + '/langs/' + tinymce.EditorManager.settings.language + '.js';
				s = tinymce.EditorManager.settings;

				if (s) {
					if (!tinymce.dom.Event.domLoaded && !s.strict_mode)
						tinymce.ScriptLoader.load(u);
					else
						tinymce.ScriptLoader.add(u);
				}
			}
		},

		add : function(id, th) {
			this.themes.push(th);
			this.lookup[id] = th;
		},

		load : function(th, u, cb, s) {
			if (u.indexOf('/') != 0 && u.indexOf('://') == -1)
				u = tinymce.baseURL + '/' +  u;

			this.themeURLs[th] = u.substring(0, u.lastIndexOf('/'));
			tinymce.ScriptLoader.add(u, cb, s);
		}
	});
}());
/* file:jscripts/tiny_mce/classes/PluginManager.js */

(function() {
	var Dispatcher = tinymce.util.Dispatcher, each = tinymce.each;

	tinymce.create('static tinymce.PluginManager', {
		plugins : [],
		pluginURLs : {},
		lookup : {},
		onAdd : new Dispatcher(this),

		get : function(n) {
			return this.lookup[n];
		},

		requireLangPack : function(n) {
			var u, s;

			if (tinymce.EditorManager.settings) {
				u = this.pluginURLs[n] + '/langs/' + tinymce.EditorManager.settings.language + '.js';
				s = tinymce.EditorManager.settings;

				if (s) {
					if (!tinymce.dom.Event.domLoaded && !s.strict_mode)
						tinymce.ScriptLoader.load(u);
					else
						tinymce.ScriptLoader.add(u);
				}
			}
		},

		hasLangPack : function(n) {
			return this.hasLangPack[n];
		},

		add : function(id, th) {
			this.plugins.push(th);
			this.lookup[id] = th;
			this.onAdd.dispatch(id, th);
		},

		load : function(p, u, cb, s) {
			if (u.indexOf('/') != 0 && u.indexOf('://') == -1)
				u = tinymce.baseURL + '/' +  u;

			this.pluginURLs[p] = u.substring(0, u.lastIndexOf('/'));
			tinymce.ScriptLoader.add(u, cb, s);
		}
	});
}());
/* file:jscripts/tiny_mce/classes/EditorManager.js */

(function() {
	// Shorten names
	var each = tinymce.each, extend = tinymce.extend, DOM = tinymce.DOM, Event = tinymce.dom.Event, ThemeManager = tinymce.ThemeManager, PluginManager = tinymce.PluginManager;

	tinymce.create('static tinymce.EditorManager', {
		editors : {},
		i18n : {},
		activeEditor : null,

		init : function(s) {
			var t = this, pl, sl = tinymce.ScriptLoader;

			s = extend({
				theme : "simple",
				language : "en"
			}, s);

			t.settings = s;

			if (s.strict_loading_mode)
				sl.settings.strict_mode = s.strict_loading_mode;

			// If page not loaded and strict mode isn't enabled then load them
			if (!Event.domLoaded && !sl.settings.strict_mode) {
				// Load language
				if (s.language)
					sl.add(tinymce.baseURL + '/langs/' + s.language + '.js');

				// Load theme
				if (s.theme)
					ThemeManager.load(s.theme, 'themes/' + s.theme + '/editor_template' + tinymce.suffix + '.js');

				// Load plugins
				if (s.plugins) {
					pl = s.plugins.split(',');

					// Load compat2x first
					if (tinymce.indexOf(pl, 'compat2x') != -1)
						PluginManager.load('compat2x', 'plugins/compat2x/editor_plugin' + tinymce.suffix + '.js');

					// Load rest if plugins
					each(pl, function(v) {
						if (v) {
							// Skip safari plugin for other browsers
							if (!tinymce.isWebKit && v == 'safari')
								return;

							PluginManager.load(v, 'plugins/' + v + '/editor_plugin' + tinymce.suffix + '.js');
						}
					});
				}

				sl.loadQue();
			}

			Event.add(document, 'init', function() {
				t.execCallback(s, 'onpageload');
				t.initEditors(s);
			});
		},

		initEditors : function(s) {
			var l, t = this, co;

			// Verify that it's a valid browser
			if (s.browsers) {
				l = false;

				each(s.browsers.split(','), function(v) {
					switch (v) {
						case 'ie':
						case 'msie':
							if (tinymce.isIE)
								l = true;
							break;

						case 'gecko':
							if (tinymce.isGecko)
								l = true;
							break;

						case 'safari':
						case 'webkit':
							if (tinymce.isWebKit)
								l = true;
							break;

						case 'opera':
							if (tinymce.isOpera)
								l = true;

							break;
					}
				});

				// Not a valid one
				if (!l)
					return;
			}

			switch (s.mode) {
				case "exact":
					l = s.elements || '';
					each(l.split(','), function(v) {
						new tinymce.Editor(v, s).render();
					});
					break;

				case "textareas":
					each(DOM.select('textarea'), function(v) {
						if (s.editor_deselector && DOM.hasClass(v, s.editor_deselector))
							return;

						if (!s.editor_selector || DOM.hasClass(v, s.editor_selector))
							new tinymce.Editor(v.id = (v.id || v.name), s).render();
					});
					break;
			}

			// Call onInit when all editors are initialized
			if (s.oninit) {
				l = co = 0;

				each (t.editors, function(ed) {
					co++;

					if (!ed.initialized) {
						// Wait for it
						ed.onInit.add(function() {
							l++;

							// All done
							if (l == co)
								t.execCallback(s, 'oninit');
						});
					} else
						l++;

					// All done
					if (l == co)
						t.execCallback(s, 'oninit');					
				});
			}
		},

		get : function(id) {
			return this.editors[id];
		},

		getInstanceById : function(id) {
			return this.get(id);
		},

		add : function(e) {
			this.editors[e.id] = e;
			this.selectedInstance = this.activeEditor = e;
			return e;
		},

		remove : function(e) {
			var t = this;

			delete t.editors[e.id];

			each(t.editors, function(e) {
				t.selectedInstance = t.activeEditor = e;
				return false; // Break
			});

			e.destroy();

			return e;
		},

		execCommand : function(c, u, v) {
			var t = this, ed = t.get(v);

			// Manager commands
			switch (c) {
				case "mceFocus":
					ed.getWin.focus();
					return true;

				case "mceAddEditor":
				case "mceAddControl":
					new tinymce.Editor(v, t.settings).render();
					return true;

				case "mceAddFrameControl":
					// TODO: Implement this
					return true;

				case "mceRemoveEditor":
				case "mceRemoveControl":
					ed.remove();
					return true;

				case 'mceToggleEditor':
					if (!ed) {
						t.execCommand('mceAddControl', 0, v);
						return true;
					}

					if (ed.isHidden())
						ed.show();
					else
						ed.hide();

					return true;
			}

			// Run command on active editor
			if (t.activeEditor)
				return t.activeEditor.execCommand(c, u, v);

			return false;
		},

		execInstanceCommand : function(id, c, u, v) {
			var ed = this.get(id);

			if (ed)
				return ed.execCommand(c, u, v);

			return false;
		},

		triggerSave : function() {
			each(this.editors, function(e) {
				e.save();
			});
		},

		execCallback : function(se, n, s) {
			var f = se[n];

			if (!f)
				return;

			if (tinymce.is(f, 'string')) {
				s = f.replace(/\.\w+$/, '');
				s = s ? tinymce.get(s) : 0;
				f = tinymce.get(f);
			}

			return f.apply(s || this, Array.prototype.slice.call(arguments, 2));
		},

		addI18n : function(p, o) {
			var lo, i18n = this.i18n;

			if (!tinymce.is(p, 'string')) {
				each(p, function(o, lc) {
					each(o, function(o, g) {
						each(o, function(o, k) {
							if (g === 'common')
								i18n[lc + '.' + k] = o;
							else
								i18n[lc + '.' + g + '.' + k] = o;
						});
					});
				});
			} else {
				each(o, function(o, k) {
					i18n[p + '.' + k] = o;
				});
			}
		}
	});

	tinymce.EditorManager.baseURI = new tinymce.util.URI(tinymce.baseURL);
	tinymce.baseURL = tinymce.EditorManager.baseURI.getURI();
})();

// Short for editor manager
var tinyMCE = tinymce.EditorManager;

/* file:jscripts/tiny_mce/classes/Editor.js */

(function() {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, extend = tinymce.extend, Dispatcher = tinymce.util.Dispatcher;
	var each = tinymce.each, isGecko = tinymce.isGecko, isIE = tinymce.isIE, isWebKit = tinymce.isWebKit;
	var is = tinymce.is, ThemeManager = tinymce.ThemeManager, PluginManager = tinymce.PluginManager, EditorManager = tinymce.EditorManager;
	var indexOf = tinymce.indexOf, filter = tinymce.filter;

	tinymce.create('tinymce.Editor', {
		Editor : function(id, s) {
			var t = this;

			t.id = t.editorId = id;
			t.execCommands = {};
			t.queryStateCommands = {};
			t.queryValueCommands = {};
			t.plugins = {};

			// Add events
			each([
				'onPreInit',
				'onBeforeRenderUI',
				'onPostRender',
				'onInit',
				'onRemove',
				'onShow',
				'onHide',
				'onActivate',
				'onDeactivate',
				'onClick',
				'onEvent',
				'onMouseUp',
				'onMouseDown',
				'onDblClick',
				'onKeyDown',
				'onKeyUp',
				'onKeyPress',
				'onContextMenu',
				'onSubmit',
				'onReset',
				'onPaste',
				'onPreProcess',
				'onPostProcess',
				'onBeforeSetContent',
				'onBeforeGetContent',
				'onSetContent',
				'onGetContent',
				'onLoadContent',
				'onSaveContent',
				'onNodeChange',
				'onChange',
				'onBeforeExecCommand',
				'onExecCommand',
				'onUndo',
				'onRedo',
				'onVisualAid',
				'onSetProgressState'
			], function(e) {
				t[e] = new Dispatcher(t);
			});

			t.documentBasePath = document.location.pathname.replace(/\/[\w.]+$/, '');
			if (!/\/$/.test(t.documentBasePath))
				t.documentBasePath += '/';

			// Default editor config
			t.settings = s = extend({
				id : id,
				language : 'en',
				docs_language : 'en',
				theme : 'simple',
				skin : 'default',
				delta_width : 0,
				delta_height : 0,
				popup_css : '',
				plugins : '',
				document_base_url : t.documentBasePath,
				add_form_submit_trigger : 1,
				submit_patch : 1,
				add_unload_trigger : 1,
				convert_urls : 1,
				relative_urls : 1,
				remove_script_host : 1,
				table_inline_editing : 0,
				object_resizing : 1,
				cleanup : 1,
				accessibility_focus : 1,
				custom_shortcuts : 1,
				custom_undo_redo_keyboard_shortcuts : 1,
				custom_undo_redo_restore_selection : 1,
				custom_undo_redo : 1,
				doctype : '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',
				visual_table_class : 'mceItemTable',
				visual : 1,
				inline_styles : true,
				convert_fonts_to_spans : true,
				font_size_style_values : 'xx-small,x-small,small,medium,large,x-large,xx-large',
				apply_source_formatting : 1,
				directionality : 'ltr',
				forced_root_block : 'p',
				valid_elements : '@[id|class|style|title|dir<ltr?rtl|lang|xml::lang|onclick|ondblclick|onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onkeypress|onkeydown|onkeyup],a[rel|rev|charset|hreflang|tabindex|accesskey|type|name|href|target|title|class|onfocus|onblur],strong/b,em/i,strike,u,#p[align],-ol,-ul,-li,br,img[longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align],-sub,-sup,-blockquote,-table[border=0|cellspacing|cellpadding|width|frame|rules|height|align|summary|bgcolor|background|bordercolor],-tr[rowspan|width|height|align|valign|bgcolor|background|bordercolor],tbody,thead,tfoot,#td[colspan|rowspan|width|height|align|valign|bgcolor|background|bordercolor|scope],-th[colspan|rowspan|width|height|align|valign|scope],caption,-div,-span,-pre,address,-h1,-h2,-h3,-h4,-h5,-h6,hr[size|noshade],-font[face|size|color],dd,dl,dt,cite,abbr,acronym,del[datetime|cite],ins[datetime|cite],object[classid|width|height|codebase|*],param[name|value],embed[type|width|height|src|*]'
			}, s);

			// Setup URIs
			t.documentBaseURI = new tinymce.util.URI(s.document_base_url);
			t.baseURI = EditorManager.baseURI;
		},

		render : function() {
			var t = this, s = t.settings, id = t.id, sl = tinymce.ScriptLoader;

			t.windowManager = new tinymce.WindowManager(t);

			// Setup popup CSS path(s)
			s.popup_css = t.baseURI.toAbsolute(s.popup_css || "themes/" + s.theme + "/skins/" + s.skin + "/dialog.css");

			if (s.popup_css_add)
				s.popup_css += ',' + s.popup_css_add;

			if (s.encoding == 'xml') {
				t.onGetContent.add(function(o) {
					if (o.get)
						o.content = DOM.encode(o.content);
				});
			}

			if (s.add_form_submit_trigger) {
				t.onSubmit.add(function() {
					if (t.initialized)
						t.save();
				});
			}

			Event.add(document, 'unload', function() {
				if (t.initialized && !t.destroyed && s.add_unload_trigger)
					t.save({format : 'raw', no_events : true});
			});

			tinymce.addUnload(t.destroy, t);

			if (s.submit_patch)
				t._addSubmitPatch();

			// Load scripts
			function loadScripts() {
				sl.add(tinymce.baseURL + '/langs/' + s.language + '.js');
				ThemeManager.load(s.theme, 'themes/' + s.theme + '/editor_template' + tinymce.suffix + '.js');

				each(s.plugins.split(','), function(p) {
					if (p) {
						// Skip safari plugin for other browsers
						if (!isWebKit && p == 'safari')
							return;

						PluginManager.load(p, 'plugins/' + p + '/editor_plugin' + tinymce.suffix + '.js');
					}
				});

				// Init when que is loaded
				sl.loadQue(function() {
					if (s.ask) {
						function ask() {
							t.windowManager.confirm(t.getLang('edit_confirm'), function(s) {
								if (s)
									t.init();
								else
									Event.remove(t.id, 'focus', ask);
							});
						};

						Event.add(t.id, 'focus', ask);
						return;
					}

					t.init();
				});
			};

			// Load compat2x first
			if (s.plugins.indexOf('compat2x') != -1) {
				PluginManager.load('compat2x', 'plugins/compat2x/editor_plugin' + tinymce.suffix + '.js');
				sl.loadQue(loadScripts);
			} else
				loadScripts();
		},

		init : function() {
			var n, t = this, s = t.settings, w, h, e = DOM.get(s.id), o;

			EditorManager.add(t);

			// Create theme
			o = ThemeManager.get(s.theme);
			t.theme = new o(t, ThemeManager.themeURLs[s.theme]);

			// Create all plugins
			each(s.plugins.split(','), function(p) {
				var c = PluginManager.get(p), u = PluginManager.pluginURLs[p];

				if (c)
					t.plugins[p] = new c(t, u);
			});

			// Setup control factory
			t.controlManager = new tinymce.ControlManager(t);
			t.undoManager = new tinymce.UndoManager(t);

			// Pass through
			t.undoManager.onAdd.add(t.onChange.dispatch, t.onChange);
			t.undoManager.onUndo.add(t.onUndo.dispatch, t.onUndo);
			t.undoManager.onRedo.add(t.onRedo.dispatch, t.onRedo);

			if (s.custom_undo_redo) {
				t.onExecCommand.add(function(cmd) {
					if (cmd != 'Undo' && cmd != 'Redo' && cmd != 'mceRepaint')
						t.undoManager.add();
				});
			}

			t.onExecCommand.add(function(c) {
				// Don't refresh the select lists until caret move
				if (!/^(FontName|FontSize)$/.test(c))
					t.nodeChanged();
			});

			// Remove ghost selections on images and tables in Gecko
			if (isGecko) {
				function repaint() {
					t.execCommand('mceRepaint');
				};

				t.onUndo.add(repaint);
				t.onRedo.add(repaint);
				t.onSetContent.add(repaint);
			}

			// Enables users to override the control factory
			t.onBeforeRenderUI.dispatch(t.controlManager);

			// Measure box
			w = s.width || e.style.width || e.clientWidth;
			h = s.height || e.style.height || e.clientHeight;
			t.orgDisplay = e.style.display;

			if (('' + w).indexOf('%') == -1)
				w = Math.max(parseInt(w), 100);

			if (('' + h).indexOf('%') == -1)
				h = Math.max(parseInt(h), 100);

			// Render UI
			o = t.theme.renderUI({
				targetNode : e,
				width : w,
				height : h,
				deltaWidth : s.delta_width,
				deltaHeight : s.delta_height
			});

			// Resize editor
			DOM.setStyles(o.sizeContainer || o.editorContainer, {
				width : ('' + w).indexOf('%') == -1 ? w + (o.deltaWidth || 0) : w,
				height : ('' + h).indexOf('%') == -1 ? h + (o.deltaHeight || 0) : h
			});

			// Create iframe
			n = DOM.add(o.iframeContainer, 'iframe', {
				id : s.id + "_ifr",
				src : 'javascript:""', // Workaround for HTTPS warning in IE6/7
				frameBorder : '0',
				style : {
					width : '100%',
					height : (o.iframeHeight || h) + (o.deltaHeight || 0)
				}
			});

			t.contentAreaContainer = o.iframeContainer;
			DOM.get(o.editorContainer).style.display = t.orgDisplay;
			DOM.get(s.id).style.display = 'none';

			// Safari 2.x requires us to wait for the load event and load a real HTML doc
			if (tinymce.isOldWebKit) {
				Event.add(n, 'load', t.setupIframe, t);
				n.src = tinymce.baseURL + '/plugins/safari/blank.htm';
			} else {
				t.setupIframe();
				e = n = o = null; // Cleanup
			}
		},

		setupIframe : function() {
			var t = this, s = t.settings, e = DOM.get(s.id), d = t.getDoc();

			// Design mode needs to be added here Ctrl+A will fail otherwise
			if (isGecko)
				t.getDoc().designMode = 'On';

			// Setup body
			d.open();
			d.write(s.doctype + '<html><head><base href="' + t.documentBaseURI.getURI() + '" /><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head><body id="tinymce"></body></html>');
			d.close();

			// Setup objects
			t.dom = new tinymce.DOM.DOMUtils(t.getDoc(), {
				keep_values : true,
				url_converter : t.convertURL,
				url_converter_scope : t,
				hex_colors : s.force_hex_style_colors
			});

			t.serializer = new tinymce.dom.Serializer({
				entity_encoding : s.entity_encoding,
				entities : s.entities,
				valid_elements : s.verify_html === false ? '*[*]' : s.valid_elements,
				extended_valid_elements : s.extended_valid_elements,
				valid_child_elements : s.valid_child_elements,
				invalid_elements : s.invalid_elements,
				fix_table_elements : s.fix_table_elements,
				fix_list_elements : s.fix_list_elements,
				fix_content_duplication : s.fix_content_duplication,
				convert_fonts_to_spans : s.convert_fonts_to_spans,
				font_size_classes  : s.font_size_classes,
				font_size_style_values : s.font_size_style_values,
				apply_source_formatting : s.apply_source_formatting,
				dom : t.dom
			});

			t.selection = new tinymce.dom.Selection(t.dom, t.getWin(), t.serializer);
			t.forceBlocks = new tinymce.ForceBlocks(t, {
				forced_root_block : s.forced_root_block
			});
			t.editorCommands = new tinymce.EditorCommands(t);

			// Pass through
			t.serializer.onPreProcess.add(t.onPreProcess.dispatch, t.onPreProcess);
			t.serializer.onPostProcess.add(t.onPostProcess.dispatch, t.onPostProcess);

			if (s.content_css)
				t.dom.loadCSS(t.documentBaseURI.toAbsolute(s.content_css));

			t.onPreInit.dispatch();

			if (!s.gecko_spellcheck)
				t.getBody().spellcheck = 0;

			t._addEvents();

			// IE fired load event twice if designMode is set
			if (!isIE)
				t.getDoc().designMode = 'On';
			else
				t.getBody().contentEditable = true;

			t.controlManager.onPostRender.dispatch();
			t.onPostRender.dispatch();

			if (s.directionality)
				t.getBody().dir = s.directionality;

			if (s.nowrap)
				t.getBody().style.whiteSpace = "nowrap";

			if (s.auto_resize)
				t.onNodeChange.add(t.resizeToContent, t);

			if (s.handle_node_change_callback) {
				t.onNodeChange.add(function(cm, n) {
					t.execCallback('handle_node_change_callback', t.id, n, -1, -1, true, t.selection.isCollapsed());
				});
			}

			if (s.onchange_callback) {
				t.onChange.add(function(l) {
					t.execCallback('onchange_callback', t, l);
				});
			}

			if (s.convert_newlines_to_brs) {
				t.onBeforeSetContent.add(function(o) {
					if (o.initial)
						o.content = o.content.replace(/\r?\n/g, '<br />');
				});
			}

			if (s.preformatted) {
				t.onPostProcess.add(function(o) {
					o.content = o.content.replace(/^\s*<pre.*?>/, '');
					o.content = o.content.replace(/<\/pre>\s*$/, '');

					if (o.set)
						o.content = '<pre class="mceItemHidden">' + o.content + '</pre>';
				});
			}

			if (s.verify_css_classes) {
				t.serializer.attribValueFilter = function(n, v) {
					var s, cl;

					if (n == 'class') {
						// Build regexp for classes
						if (!t.classesRE) {
							cl = t.getClasses();

							if (cl.length > 0) {
								s = '';

								each (cl, function(o) {
									s += (s ? '|' : '') + o['class'];
								});

								t.classesRE = new RegExp('(' + s + ')', 'gi');
							}
						}

						return !t.classesRE || /(\bmceItem\w+\b|\bmceTemp\w+\b)/g.test(v) || t.classesRE.test(v) ? v : '';
					}

					return v;
				};
			}

			if (s.convert_fonts_to_spans)
				t._convertFonts();

			if (s.inline_styles)
				t._convertInlineElements();

			if (s.cleanup_callback) {
				t.onSetContent.add(function(o) {
					if (o.initial) {
						t.setContent(t.execCallback('cleanup_callback', 'insert_to_editor', o.content, o), {format : 'raw', no_events : true});
						t.execCallback('cleanup_callback', 'insert_to_editor_dom', t.getDoc(), o);
					}
				});

				t.onPreProcess.add(function(o) {
					if (o.set)
						t.execCallback('cleanup_callback', 'insert_to_editor_dom', o.node, o);

					if (o.get)
						t.execCallback('cleanup_callback', 'get_from_editor_dom', o.node, o);
				});

				t.onPostProcess.add(function(o) {
					if (o.set)
						o.content = t.execCallback('cleanup_callback', 'insert_to_editor', o.content, o);

					if (o.get)						
						o.content = t.execCallback('cleanup_callback', 'get_from_editor', o.content, o);
				});
			}

			if (s.save_callback) {
				t.onGetContent.add(function(o) {
					if (o.save)
						o.content = t.execCallback('save_callback', t.id, o.content, t.getBody());
				});
			}

			if (s.handle_event_callback) {
				t.onEvent.add(function(e, ed, o) {
					if (t.execCallback('handle_event_callback', e, ed, o) === false)
						Event.cancel(e);
				});
			}

			t.onSetContent.add(function() {
				// Safari needs some time, it will crash the browser when a link is created otherwise
				window.setTimeout(function() {
					t.addVisual(t.getBody());
				}, 1);
			});
			t.load({initial : true, format : (s.cleanup_on_startup ? 'html' : 'raw')});
			t.startContent = t.getContent({format : 'raw'});
			t.undoManager.add({initial : true});

			t.initialized = true;

			t.onInit.dispatch(t);
			t.execCallback('setupcontent_callback', t.id, t.getBody(), t.getDoc());
			t.execCallback('init_instance_callback', t);
			t.focus(true);
			t.nodeChanged({initial : 1});

			// Handle auto focus
			if (s.auto_focus) {
				setTimeout(function () {
					var ed = EditorManager.get(s.auto_focus);

					ed.selection.select(ed.getBody(), 1);
					ed.selection.collapse(1);
					ed.getWin().focus();
				}, 100);
			}

			e = null;
		},

		focus : function(sf) {
			var oed, t = this;

			if (!sf)
				t.getWin().focus();

			if (EditorManager.activeEditor != t) {
				if ((oed = EditorManager.activeEditor) != null)
					oed.onDeactivate.dispatch(t);

				t.onActivate.dispatch(oed);
				EditorManager.activeEditor = t;
			}

			EditorManager.activeEditor = t;
		},

		execCallback : function(n) {
			var t = this, f = t.settings[n], s;

			if (!f)
				return;

			// Look through lookup
			if (t.callbackLookup && (s = t.callbackLookup[n])) {
				f = s.func;
				s = s.scope;
			}

			if (is(f, 'string')) {
				s = f.replace(/\.\w+$/, '');
				s = s ? tinymce.get(s) : 0;
				f = tinymce.get(f);
				t.callbackLookup = t.callbackLookup || {};
				t.callbackLookup[n] = {func : f, scope : s};
			}

			return f.apply(s || t, Array.prototype.slice.call(arguments, 1));
		},

		translate : function(s) {
			var c = this.settings.language, i18n = tinymce.EditorManager.i18n;

			return i18n[c + '.' + s] || s.replace(/{\#([^}]+)\}/g, function(a, b) {
				return i18n[c + '.' + b] || '{#' + b + '}';
			});
		},

		getLang : function(n, dv) {
			return tinymce.EditorManager.i18n[this.settings.language + '.' + n] || (is(dv) ? dv : '{#' + n + '}');
		},

		getParam : function(n, dv) {
			return this.settings[n] || dv;
		},

		setEditingOptions : function() {
			var t = this, d = t.getDoc(), s = t.settings;

			if (isGecko) {
				t.setUseCSS(false);

				if (!s.table_inline_editing)
					try {d.execCommand('enableInlineTableEditing', false, false);} catch (ex) {}

				if (!s.object_resizing)
					try {d.execCommand('enableObjectResizing', false, false);} catch (ex) {}
			}
		},

		setUseCSS : function(s) {
			var d = this.getDoc();

			if (isGecko) {
				try {
					// Try new Gecko method
					d.execCommand("styleWithCSS", 0, s);
				} catch (ex) {
					// Use old
					d.execCommand("useCSS", 0, !s);
				}
			}
		},

		nodeChanged : function(o) {
			var t = this, s = t.selection;

			this.onNodeChange.dispatch(
				o ? o.controlManager || t.controlManager : t.controlManager,
				s.getNode() || this.getBody(),
				s.isCollapsed()
			);
		},

		addCommand : function(n, f, s) {
			this.execCommands[n] = {func : f, scope : s || this};
		},

		addCommandQueryState : function(n, f, s) {
			this.queryStateCommands[n] = {func : f, scope : s || this};
		},

		execCommand : function(cmd, ui, val) {
			var t = this, s = 0, o;

			if (!/^(mceAddUndoLevel|mceEndUndoLevel|mceBeginUndoLevel)$/.test(cmd))
				t.focus();

			t.setEditingOptions();
			t.onBeforeExecCommand.dispatch(cmd, ui, val);

			// Comamnd callback
			if (t.execCallback('execcommand_callback', null, t.id, t.selection.getNode(), cmd, ui, val)) {
				t.onExecCommand.dispatch(cmd, ui, val);
				return true;
			}

			// Registred commands
			if (o = t.execCommands[cmd]) {
				s = o.func.call(o.scope, ui, val);
				t.onExecCommand.dispatch(cmd, ui, val);
				return s;
			}

			// Plugin commands
			each(t.plugins, function(p) {
				if (p.execCommand && p.execCommand(cmd, ui, val)) {
					t.onExecCommand.dispatch(cmd, ui, val);
					s = 1;
					return false;
				}
			});

			if (s)
				return true;

			// Theme commands
			if (t.theme.execCommand && t.theme.execCommand(cmd, ui, val)) {
				t.onExecCommand.dispatch(cmd, ui, val);
				return true;
			}

			// Editor commands
			if (t.editorCommands.execCommand(cmd, ui, val)) {
				t.onExecCommand.dispatch(cmd, ui, val);
				return true;
			}

			// Browser commands
			t.getDoc().execCommand(cmd, ui, val);
			t.onExecCommand.dispatch(cmd, ui, val);
		},

		queryCommandState : function(c) {
			var t = this, o;

			// Registred commands
			if (o = t.queryStateCommands[c])
				return o.func.call(o.scope);

			// Registred commands
			o = t.editorCommands.queryCommandState(c);
			if (o !== -1)
				return o;

			// Browser commands
			return this.getDoc().queryCommandState(c);
		},

		queryCommandValue : function(c) {
			var t = this, o;

			// Registred commands
			if (o = t.queryValueCommands[c])
				return o.func.call(o.scope);

			// Registred commands
			o = t.editorCommands.queryCommandValue(c);
			if (is(o))
				return o;

			// Browser commands
			return this.getDoc().queryCommandValue(c);
		},

		// addShortcut('ctrl+v', function(x) {});
		addShortcut : function(pa, desc, cmd_func, sc) {
			var t = this, c;

			if (!t.settings.custom_shortcuts)
				return false;

			t.shortcuts = t.shortcuts || {};

			if (is(cmd_func, 'string')) {
				c = cmd_func;

				cmd_func = function() {
					t.execCommand(c, false, null);
				};
			}

			if (is(cmd_func, 'object')) {
				c = cmd_func;

				cmd_func = function() {
					t.execCommand(c[0], c[1], c[2]);
				};
			}

			each(pa.split(','), function(pa) {
				var o = {
					func : cmd_func,
					scope : sc || this,
					desc : desc,
					alt : false,
					ctrl : false,
					shift : false
				};

				each(pa.split('+'), function(v) {
					switch (v) {
						case 'alt':
						case 'ctrl':
						case 'shift':
							o[v] = true;
							break;

						default:
							o.charCode = v.charCodeAt(0);
							o.keyCode = v.toUpperCase().charCodeAt(0);
					}
				});

				t.shortcuts[(o.ctrl ? 'ctrl' : '') + ',' + (o.alt ? 'alt' : '') + ',' + (o.shift ? 'shift' : '') + ',' + o.keyCode] = o;
			});

			return true;
		},

		show : function() {
			var t = this, s = t.settings;

			t.getContainer().style.display = 'block';
			DOM.get(s.id).style.display = 'none';
			t.load();
		},

		hide : function() {
			var t = this, s = t.settings;

			// Fixed bug where IE has a blinking cursor left from the editor
			if (isIE)
				t.execCommand('SelectAll');

			t.getContainer().style.display = 'none';
			DOM.get(s.id).style.display = t.orgDisplay;
			t.save();
		},

		setProgressState : function(b, ti, o) {
			this.onSetProgressState.dispatch(b, ti, o);
		},

		isHidden : function() {
			return !DOM.isHidden(this.id);
		},

		remove : function() {
			var t = this;

			t.hide();
			DOM.remove(t.getContainer());

			t.execCallback('remove_instance_callback', t);
			t.onRemove.dispatch();

			EditorManager.remove(t);
		},

		resizeToContent : function() {
			var t = this, e = DOM.get(t.id + "_ifr");

			if (e)
				DOM.setStyle(e, 'height', t.getBody().scrollHeight);
		},

		load : function(o) {
			var t = this, e = DOM.get(t.id), h;

			o = o || {};
			o.load = true;

			h = t.setContent(is(e.value) ? e.value : e.innerHTML, o);
			o.element = e;
			t.onLoadContent.dispatch(o);
			o.element = e = null;

			return h;
		},

		save : function(o) {
			var t = this, e = DOM.get(t.id), h;

			o = o || {};
			o.save = true;

			if (/TEXTAREA|INPUT/.test(e.nodeName))
				e.value = h = t.getContent(o);
			else
				e.innerHTML = h = t.getContent(o);

			o.element = e;
			this.onSaveContent.dispatch(o);
			o.element = e = null;

			return h;
		},

		setContent : function(h, o) {
			var t = this;

			// Padd empty content in Gecko
			// Commands will otherwise fail on the content
			// It will also be impossible to place the caret in the editor unless there is a BR element present
			if (tinymce.isGecko && (h.length === 0 || /^\s+$/.test(h)))
				h = '<br />';

			o = o || {};
			o.format = o.format || 'html';
			o.set = true;
			o.content = h;

			if (!o.no_events)
				t.onBeforeSetContent.dispatch(o);

			o.content = t.dom.setHTML(t.getBody(), o.content);

			if (o.format != 'raw' && t.settings.cleanup) {
				o.getInner = true;
				o.content = t.dom.setHTML(t.getBody(), t.serializer.serialize(t.getBody(), o));
			}

			if (!o.no_events)
				t.onSetContent.dispatch(o);

			return o.content;
		},

		getContent : function(o) {
			var t = this, h;

			o = o || {};
			o.format = o.format || 'html';
			o.get = true;

			if (!o.no_events)
				t.onBeforeGetContent.dispatch(o);

			if (o.format != 'raw' && t.settings.cleanup) {
				o.getInner = true;
				h = t.serializer.serialize(t.getBody(), o);
			} else
				h = t.getBody().innerHTML;

			h = h.replace(/^\s*|\s*$/g, '');
			o = {content : h};
			t.onGetContent.dispatch(o);

			return o.content;
		},

		getContainer : function() {
			var t = this;

			if (!t.container)
				t.container = DOM.get(t.id + "_parent");

			return t.container;
		},

		getContentAreaContainer : function() {
			return this.contentAreaContainer;
		},

		getWin : function() {
			var t = this;

			if (!t.contentWindow)
				t.contentWindow = DOM.get(t.id + "_ifr").contentWindow;

			return t.contentWindow;
		},

		getDoc : function() {
			var t = this;

			if (!t.contentDocument)
				t.contentDocument = this.getWin().document;

			return t.contentDocument;
		},

		getBody : function() {
			return this.getDoc().body;
		},

		getClasses : function() {
			var t = this, cl = [], i, lo = {};

			if (t.classes)
				return t.classes;

			function addClasses(s) {
				// IE style imports
				each(s.imports, function(r) {
					addClasses(r);
				});

				each(s.cssRules || s.rules, function(r) {
					// Real type or fake it on IE
					switch (r.type || 1) {
						// Rule
						case 1:
							if (r.selectorText) {
								each(r.selectorText.split(','), function(v) {
									v = v.replace(/^\s*|\s*$|^\s\./g, "");

									if (/^\.mce/.test(v) || !/^\.[\w\-]+$/.test(v))
										return;

									v = v.substring(1);
									if (!lo[v]) {
										cl.push({'class' : v});
										lo[v] = 1;
									}
								});
							}
							break;

						// Import
						case 3:
							addClasses(r.styleSheet);
							break;
					}
				});
			};

			try {
				each(t.getDoc().styleSheets, addClasses);
			} catch (ex) {
				// Ignore
			}

			if (cl.length > 0)
				t.classes = cl;

			return cl;
		},

		convertURL : function(u, n, e) {
			var t = this, s = t.settings;

			// Use callback instead
			if (s.urlconverter_callback)
				return t.execCallback('urlconverter_callback', u, e, true, n);

			// Don't convert link href since thats the CSS files that gets loaded into the editor
			if (!s.convert_urls || (e && e.nodeName == 'LINK'))
				return u;

			// Convert to relative
			if (s.relative_urls)
				return t.documentBaseURI.toRelative(u);

			// Convert to absolute
			u = t.documentBaseURI.toAbsolute(u, s.remove_script_host);

			return u;
		},

		isDirty : function() {
			var t = this;

			return tinymce.trim(t.startContent) != tinymce.trim(t.getContent({format : 'raw', no_events : 1})) && !t.isNotDirty;
		},

		destroy : function() {
			var t = this;

			if (t.formElement) {
				t.formElement.submit = t.formElement._submit;
				t.formElement._submit = null;
			}

			t.contentAreaContainer = t.formElement = t.container = t.contentDocument = t.contentWindow = null;

			if (t.selection)
				t.selection = t.selection.win = t.selection.dom = t.selection.dom.doc = null;

			t.destroyed = 1;
		},

		addVisual : function(e) {
			var t = this, s = t.settings;

			e = e || t.getBody();

			if (!is(t.hasVisual))
				t.hasVisual = s.visual;

			each(tinymce.filter(e.getElementsByTagName('table')).concat(e.getElementsByTagName('a')), function(e) {
				var v;

				switch (e.nodeName) {
					case 'TABLE':
						v = t.dom.getAttrib(e, 'border');

						if (!v || v == '0') {
							if (t.hasVisual)
								t.dom.addClass(e, s.visual_table_class);
							else
								t.dom.removeClass(e, s.visual_table_class);
						}

						return;

					case 'A':
						v = t.dom.getAttrib(e, 'name');

						if (v) {
							if (t.hasVisual)
								t.dom.addClass(e, 'mceItemAnchor');
							else
								t.dom.removeClass(e, 'mceItemAnchor');
						}

						return;
				}
			});

			t.onVisualAid.dispatch(e, t.hasVisual);
		},

		addButton : function(n, ti, cm, s) {
			var t = this;

			t.buttons = t.buttons || {};
			t.buttons[n] = {title : ti, cmd : cm, settings : s || {}};
		},

		// Private/internal functions

		_addSubmitPatch : function() {
			var t = this, n = DOM.get(t.id).form;

			if (!n)
				return;

			n._submit = n.submit;
			t.formElement = n;

			// This will not work in WebKit
			n.submit = function() {
				if (t.initialized)
					t.save();

				return this._submit(this);
			};

			n = null;
		},

		_addEvents : function() {
			// 'focus', 'blur', 'dblclick', 'beforedeactivate', submit, reset
			var t = this, i, s = t.settings, lo = {
				mouseup : 'onMouseUp',
				mousedown : 'onMouseDown',
				click : 'onClick',
				keyup : 'onKeyUp',
				keydown : 'onKeyDown',
				keypress : 'onKeyPress',
				submit : 'onSubmit',
				reset : 'onReset',
				contextmenu : 'onContextMenu',
				dblclick : 'onDblClick',
				paste : 'onPaste' // Doesn't work in all browsers yet
			};

			function eventHandler(e, o) {
				var ty = e.type;

				// Generic event handler
				if (t.onEvent.dispatch(e, t, o) !== false) {
					// Specific event handler
					t[lo[e.fakeType || e.type]].dispatch(e, t, o);
				}
			};

			// Add DOM events
			each(lo, function(v, k) {
				switch (k) {
					case 'contextmenu':
						if (tinymce.isOpera) {
							// Fake contextmenu on Opera
							Event.add(t.getDoc(), 'mousedown', function(e) {
								if (e.ctrlKey) {
									e.fakeType = 'contextmenu';
									eventHandler(e);
								}
							});
						} else
							Event.add(t.getDoc(), k, eventHandler);
						break;

					case 'paste':
						Event.add(t.getBody(), k, function(e) {
							var tx, h, el, r;

							// Get plain text data
							if (e.clipboardData)
								tx = e.clipboardData.getData('text/plain');
							else if (tinymce.isIE)
								tx = t.getWin().clipboardData.getData('Text');

							// Get HTML data
							/*if (tinymce.isIE) {
								el = DOM.add(document.body, 'div', {style : 'visibility:hidden;overflow:hidden;position:absolute;width:1px;height:1px'});
								r = document.body.createTextRange();
								r.moveToElementText(el);
								r.execCommand('Paste');
								h = el.innerHTML;
								DOM.remove(el);
							}*/

							eventHandler(e, {text : tx, html : h});
						});
						break;

					case 'submit':
					case 'reset':
						Event.add(DOM.get(t.id).form, k, eventHandler);
						break;

					default:
						Event.add(t.getDoc(), k, eventHandler);
				}
			});

			Event.add(isGecko ? t.getDoc() : t.getWin(), 'focus', function(e) {
				t.focus(true);
			});

			if (isGecko)
				t.onMouseDown.add(t.setEditingOptions);

			// Add node change handlers
			t.onMouseUp.add(t.nodeChanged);
			t.onClick.add(t.nodeChanged);
			t.onKeyUp.add(function(e) {
				if ((e.keyCode >= 33 && e.keyCode <= 36) || (e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode == 13 || e.keyCode == 45 || e.keyCode == 46 || e.keyCode == 8 || e.ctrlKey)
					t.nodeChanged();
			});

			// Add reset handler
			t.onReset.add(function() {
				t.setContent(t.startContent, {format : 'raw'});
			});

			// Add shortcuts
			if (s.custom_shortcuts) {
				if (s.custom_undo_redo_keyboard_shortcuts) {
					t.addShortcut('ctrl+z', t.getLang('undo_desc'), 'Undo');
					t.addShortcut('ctrl+y', t.getLang('redo_desc'), 'Redo');
				}

				// Add default shortcuts for gecko
				if (isGecko) {
					t.addShortcut('ctrl+b', t.getLang('bold_desc'), 'Bold');
					t.addShortcut('ctrl+i', t.getLang('italic_desc'), 'Italic');
					t.addShortcut('ctrl+u', t.getLang('underline_desc'), 'Underline');
				}

				// BlockFormat shortcuts keys
				for (i=1; i<=6; i++)
					t.addShortcut('ctrl+' + i, '', ['FormatBlock', false, '<h' + i + '>']);

				t.addShortcut('ctrl+7', '', ['FormatBlock', false, '<p>']);
				t.addShortcut('ctrl+8', '', ['FormatBlock', false, '<div>']);
				t.addShortcut('ctrl+9', '', ['FormatBlock', false, '<address>']);

				function find(e) {
					var v = null;

					if (!e.altKey && !e.ctrlKey && !e.metaKey)
						return v;

					each(t.shortcuts, function(o) {
						if (o.ctrl != e.ctrlKey && (!tinymce.isMac || o.ctrl == e.metaKey))
							return;

						if (o.alt != e.altKey)
							return;

						if (o.shift != e.shiftKey)
							return;

						if (e.keyCode == o.keyCode || (e.charCode && e.charCode == o.charCode)) {
							v = o;
							return false;
						}
					});

					return v;
				};

				t.onKeyUp.add(function(e) {
					var o = find(e);

					if (o)
						return Event.cancel(e);
				});

				t.onKeyPress.add(function(e) {
					var o = find(e);

					if (o)
						return Event.cancel(e);
				});

				t.onKeyDown.add(function(e) {
					var o = find(e);

					if (o) {
						o.func.call(o.scope);
						return Event.cancel(e);
					}
				});
			}

			if (tinymce.isIE) {
				// Fix so resize will only update the width and height attributes not the styles of an image
				// It will also block mceItemNoResize items
				Event.add(t.getDoc(), 'controlselect', function(e) {
					var re = t.resizeInfo, cb;

					e = e.target;

					if (re)
						Event.remove(re.node, re.ev, re.cb);

					if (!t.dom.hasClass(e, 'mceItemNoResize')) {
						ev = 'resizeend';
						cb = Event.add(e, ev, function(e) {
							var v;

							e = e.target;

							if (v = t.dom.getStyle(e, 'width')) {
								t.dom.setAttrib(e, 'width', v.replace(/[^0-9%]+/g, ''));
								t.dom.setStyle(e, 'width', '');
							}

							if (v = t.dom.getStyle(e, 'height')) {
								t.dom.setAttrib(e, 'height', v.replace(/[^0-9%]+/g, ''));
								t.dom.setStyle(e, 'height', '');
							}
						});
					} else {
						ev = 'resizestart';
						cb = Event.add(e, 'resizestart', Event.cancel, Event);
					}

					re = t.resizeInfo = {
						node : e,
						ev : ev,
						cb : cb
					};
				});

				t.onKeyDown.add(function(e) {
					switch (e.keyCode) {
						case 8:
							// Fix IE control + backspace browser bug
							if (t.selection.getRng().item) {
								t.selection.getRng().item(0).removeNode();
								return Event.cancel(e);
							}
					}
				});
			}

			// Add custom undo/redo handlers
			if (s.custom_undo_redo) {
				t.onMouseDown.add(function(e) {
					t.undoManager.typing = 0;
					t.undoManager.add();
				});

				t.onKeyUp.add(function(e) {
					if ((e.keyCode >= 33 && e.keyCode <= 36) || (e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode == 13 || e.keyCode == 45 || e.ctrlKey) {
						t.undoManager.typing = 0;
						t.undoManager.add();
					}
				});

				t.onKeyDown.add(function(e) {
					// Is caracter positon keys
					if ((e.keyCode >= 33 && e.keyCode <= 36) || (e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode == 13 || e.keyCode == 45) {
						if (t.undoManager.typing) {
							t.undoManager.add();
							t.undoManager.typing = 0;
						}

						return;
					}

					if (!t.undoManager.typing) {
						t.undoManager.add();
						t.undoManager.typing = 1;
					}
				});
			}
		},

		_convertInlineElements : function() {
			var t = this, s = t.settings, dom = t.dom;

			t.onPreProcess.add(function(o) {
				if (!s.inline_styles)
					return;

				if (o.get) {
					each(o.node.getElementsByTagName('table'), function(n) {
						if (v = dom.getAttrib(n, 'height')) {
							dom.setStyle(n, 'height', v);
							dom.setAttrib(n, 'height', '');
						}
					});

					each(filter(o.node.getElementsByTagName('u')), function(n) {
						dom.replace(dom.create('span', {style : 'text-decoration: underline;'}), n, 1);
					});

					each(filter(o.node.getElementsByTagName('strike')), function(n) {
						dom.replace(dom.create('span', {style : 'text-decoration: line-through;'}), n, 1);
					});
				} else if (o.set) {
					each(o.node.getElementsByTagName('table'), function(n) {
						if (v = dom.getStyle(n, 'height'))
							dom.setAttrib(n, 'height', v.replace(/[^0-9%]+/g, ''));
					});

					each(filter(o.node.getElementsByTagName('span')), function(n) {
						if (n.style.textDecoration == 'underline')
							dom.replace(dom.create('u'), n, 1);

						if (n.style.textDecoration == 'strikethrough')
							dom.replace(dom.create('strike'), n, 1);
					});
				}
			});
		},

		_convertFonts : function() {
			var t = this, s = t.settings, dom = t.dom, sl, cl, fz, fzn, v, i;

			// Font pt values and font size names
			fz = [8, 10, 12, 14, 18, 24, 36];
			fzn = ['xx-small', 'x-small','small','medium','large','x-large', 'xx-large'];

			if (sl = s.font_size_style_values)
				sl = sl.split(',');

			if (cl = s.font_size_classes)
				cl = cl.split(',');

			t.onPreProcess.add(function(o) {
				if (!s.inline_styles)
					return;

				if (o.set) {
					// Convert spans to fonts
					each(filter(o.node.getElementsByTagName('span')), function(n) {
						var f = dom.create('font', {
							color : dom.toHex(dom.getStyle(n, 'color')),
							face : dom.getStyle(n, 'fontFamily')
						});

						if (sl) {
							i = indexOf(sl, dom.getStyle(n, 'fontSize'));

							if (i != -1)
								dom.setAttrib(f, 'size', '' + (i + 1 || 1));
						} else if (cl) {
							i = indexOf(cl, dom.getAttrib(n, 'class'));

							v = dom.getStyle(n, 'fontSize');

							if (i == -1 && v.indexOf('pt') > 0)
								i = indexOf(fz, parseInt(v));

							if (i == -1)
								i = indexOf(fzn, v);

							if (i != -1)
								dom.setAttrib(f, 'size', '' + (i + 1 || 1));
						}

						if (f.color || f.face || f.size)
							dom.replace(f, n, 1);
					});
				} else if (o.get) {
					each(filter(o.node.getElementsByTagName('font')), function(n) {
						var sp = dom.create('span', {
							style : {
								fontFamily : dom.getAttrib(n, 'face'),
								color : dom.getAttrib(n, 'color'),
								backgroundColor : n.style.backgroundColor
							}
						});

						if (n.size) {
							if (sl)
								dom.setStyle(sp, 'fontSize', sl[parseInt(n.size) - 1]);
							else
								dom.setAttrib(sp, 'class', cl[parseInt(n.size) - 1]);
						}

						dom.replace(sp, n, 1);
					});
				}
			});
		}
	});
})();

/* file:jscripts/tiny_mce/classes/EditorCommands.js */

(function() {
	var each = tinymce.each, isIE = tinymce.isIE, isGecko = tinymce.isGecko, isOpera = tinymce.isOpera, isWebKit = tinymce.isWebKit, indexOf = tinymce.indexOf;

	tinymce.create('tinymce.EditorCommands', {
		EditorCommands : function(ed) {
			this.editor = ed;
		},

		execCommand : function(cmd, ui, val) {
			var t = this, ed = t.editor, f;

			switch (cmd) {
				case 'Cut':
				case 'Copy':
				case 'Paste':
					try {
						ed.getDoc().execCommand(cmd, ui, val);
					} catch (ex) {
						if (isGecko) {
							ed.windowManager.confirm(ed.getLang('clipboard_msg'), function(s) {
								if (s)
									window.open('http://www.mozilla.org/editor/midasdemo/securityprefs.html', 'mceExternal');
							});
						} else
							ed.windowManager.alert(ed.getLang('clipboard_no_support'));
					}

					return true;

				// Ignore these
				case 'mceResetDesignMode':
				case 'mceBeginUndoLevel':
					return true;

				// Ignore these
				case 'unlink':
					t.UnLink();
					return true;

				// Bundle these together
				case 'JustifyLeft':
				case 'JustifyCenter':
				case 'JustifyRight':
				case 'JustifyFull':
					t.mceJustify(cmd, cmd.substring(7).toLowerCase());
					return true;

				case 'mceEndUndoLevel':
				case 'mceAddUndoLevel':
					ed.undoManager.add();
					return true;

				default:
					f = this[cmd];

					if (f) {
						f.call(this, ui, val);
						return true;
					}
			}

			return false;
		},

		Indent : function() {
			var ed = this.editor, d = ed.dom, s = ed.selection, e;

			if (ed.settings.inline_styles && (!this.queryStateInsertUnorderedList() && !this.queryStateInsertOrderedList())) {
				each(this._getSelectedBlocks(), function(e) {
					d.setStyle(e, 'paddingLeft', (parseInt(e.style.paddingLeft || 0) + 30) + 'px');
				});

				return;
			}

			ed.getDoc().execCommand('Indent', false, null);

			if (isIE) {
				d.getParent(s.getNode(), function(n) {
					if (n.nodeName == 'BLOCKQUOTE') {
						n.dir = n.style.cssText = '';
					}
				});
			}
		},

		Outdent : function() {
			var ed = this.editor, d = ed.dom, s = ed.selection, e, v;

			if (ed.settings.inline_styles && (!this.queryStateInsertUnorderedList() && !this.queryStateInsertOrderedList())) {
				each(this._getSelectedBlocks(), function(e) {
					v = Math.max(0, parseInt(e.style.paddingLeft || 0) - 30);
					d.setStyle(e, 'paddingLeft', v ? v + 'px' : '');
				});

				return;
			}

			ed.getDoc().execCommand('Outdent', false, null);
		},

		mceSetAttribute : function(u, v) {
			var ed = this.editor, d = ed.dom, e;

			if (e = d.getParent(ed.selection.getNode(), d.isBlock))
				d.setAttrib(e, v.name, v.value);
		},

		mceSetContent : function(u, v) {
			this.editor.setContent(v);
		},

		mceToggleVisualAid : function() {
			var ed = this.editor;

			ed.hasVisual = !ed.hasVisual;
			ed.addVisual();
		},

		mceReplaceContent : function(u, v) {
			var s = this.editor.selection;

			s.setContent(v.replace(/\{\$selection\}/g, s.getContent({format : 'text'})));
		},

		mceInsertLink : function(u, v) {
			var ed = this.editor, e = ed.dom.getParent(ed.selection.getNode(), 'A');

			if (tinymce.is(v, 'string'))
				v = {href : v};

			function set(e) {
				each(v, function(v, k) {
					ed.dom.setAttrib(e, k, v);
				});
			};

			if (!e) {
				ed.getDoc().execCommand('CreateLink', false, 'javascript:mctmp(0);');
				each(ed.dom.select('a'), function(e) {
					if (e.href == 'javascript:mctmp(0);')
						set(e);
				});
			} else {
				if (v.href)
					set(e);
				else
					ed.dom.remove(e, 1);
			}
		},

		UnLink : function() {
			var ed = this.editor, s = ed.selection;

			if (s.isCollapsed())
				s.select(s.getNode());

			ed.getDoc().execCommand('unlink', false, null);
			s.collapse(0);
		},

		FontName : function(u, v) {
			var t = this, ed = t.editor, s = ed.selection, e;

			if (!v) {
				if (s.isCollapsed())
					s.select(s.getNode());

				t.RemoveFormat();
			} else
				ed.getDoc().execCommand('FontName', false, v);
		},

		queryCommandValue : function(c) {
			var f = this['queryValue' + c];

			if (f)
				return f.call(this, c);

			return false;
		},

		queryCommandState : function(cmd) {
			var f;

			switch (cmd) {
				// Bundle these together
				case 'JustifyLeft':
				case 'JustifyCenter':
				case 'JustifyRight':
				case 'JustifyFull':
					return this.queryStateJustify(cmd, cmd.substring(7).toLowerCase());

				default:
					if (f = this['queryState' + cmd])
						return f.call(this, cmd);
			}

			return -1;
		},

		queryValueFontSize : function() {
			var ed = this.editor, v = 0, p;

			if (isOpera || isWebKit) {
				if (p = ed.dom.getParent(ed.selection.getNode(), 'FONT'))
					v = p.size;

				return v;
			}

			return ed.getDoc().queryCommandValue('FontSize');
		},

		queryValueFontName : function() {
			var ed = this.editor, v = 0, p;

			if (p = ed.dom.getParent(ed.selection.getNode(), 'FONT'))
				v = p.face;

			if (!v)
				v = ed.getDoc().queryCommandValue('FontName');

			return v;
		},

		mceJustify : function(c, v) {
			var ed = this.editor, n = ed.selection.getNode(), nn = n.nodeName, bl, nb, dom = ed.dom, rm;

			if (ed.settings.inline_styles && this.queryStateJustify(c, v))
				rm = 1;

			bl = dom.getParent(n, ed.dom.isBlock);

			if (nn == 'IMG') {
				if (v == 'full')
					return;

				if (rm) {
					dom.setStyle(n, 'float', '');
					this.mceRepaint();
					return;
				}

				if (v == 'center') {
					if (!bl || bl.childNodes.length > 1) {
						nb = dom.create('p');
						nb.appendChild(n.cloneNode(false));

						if (bl)
							dom.insertAfter(nb, bl);
						else
							dom.insertAfter(nb, n);

						dom.remove(n);
						n = nb.firstChild;
						bl = nb;
					}

					dom.setStyle(bl, 'textAlign', v);
					dom.setStyle(n, 'float', '');
				} else
					dom.setStyle(n, 'float', v);

				this.mceRepaint();
				return;
			}

			if (!rm)
				ed.getDoc().execCommand(c, false, null);

			if (ed.settings.inline_styles) {
				if (rm) {
					dom.getParent(ed.selection.getNode(), function(n) {
						if (n.style && n.style.textAlign)
							dom.setStyle(n, 'textAlign', '');
					});

					return;
				}

				each(dom.select('*'), function(n) {
					var v = n.align;

					if (v) {
						if (v == 'full')
							v = 'justify';

						dom.setStyle(n, 'textAlign', v);
						dom.setAttrib(n, 'align', '');
					}
				});
			}
		},

		mceSetCSSClass : function(u, v) {
			this.mceSetStyleInfo(0, {command : 'setattrib', name : 'class', value : v});
		},

		getSelectedElement : function() {
			var t = this, ed = t.editor, dom = ed.dom, se = ed.selection, r = se.getRng(), r1, r2, sc, ec, so, eo, e, sp, ep, re;

			if (se.isCollapsed() || r.item)
				return se.getNode();

			// Setup regexp
			re = ed.settings.merge_styles_invalid_parents;
			if (tinymce.is(re, 'string'))
				re = new RegExp(re, 'i');

			if (isIE) {
				r1 = r.duplicate();
				r1.collapse(true);
				sc = r1.parentElement();

				r2 = r.duplicate();
				r2.collapse(false);
				ec = r2.parentElement();

				if (sc != ec) {
					r1.move('character', 1);
					sc = r1.parentElement();
				}

				if (sc == ec) {
					r1 = r.duplicate();
					r1.moveToElementText(sc);

					if (r1.compareEndPoints('StartToStart', r) == 0 && r1.compareEndPoints('EndToEnd', r) == 0)
						return re && re.test(sc.nodeName) ? null : sc;
				}
			} else {
				function getParent(n) {
					return dom.getParent(n, function(n) {return n.nodeType == 1;});
				};

				sc = r.startContainer;
				ec = r.endContainer;
				so = r.startOffset;
				eo = r.endOffset;

				if (!r.collapsed) {
					if (sc == ec) {
						if (so - eo < 2) {
							if (sc.hasChildNodes()) {
								sp = sc.childNodes[so];
								return re && re.test(sp.nodeName) ? null : sp;
							}
						}
					}
				}

				if (sc.nodeType != 3 || ec.nodeType != 3)
					return null;

				if (so == 0) {
					sp = getParent(sc);

					if (sp && sp.firstChild != sc)
						sp = null;
				}

				if (so == sc.nodeValue.length) {
					e = sc.nextSibling;

					if (e && e.nodeType == 1)
						sp = sc.nextSibling;
				}

				if (eo == 0) {
					e = ec.previousSibling;

					if (e && e.nodeType == 1)
						ep = e;
				}

				if (eo == ec.nodeValue.length) {
					ep = getParent(ec);

					if (ep && ep.lastChild != ec)
						ep = null;
				}

				// Same element
				if (sp == ep)
					return re && sp && re.test(sp.nodeName) ? null : sp;
			}

			return null;
		},

		InsertHorizontalRule : function() {
			if (tinymce.isGecko)
				this.editor.selection.setContent('<hr />');
			else
				this.editor.getDoc().execCommand('InsertHorizontalRule', false, '');
		},

		RemoveFormat : function() {
			var t = this, ed = t.editor, s = ed.selection, b;

			// Safari breaks tables
			if (isWebKit)
				s.setContent(s.getContent({format : 'raw'}).replace(/(<(span|b|i|strong|em|strike) [^>]+>|<(span|b|i|strong|em|strike)>|<\/(span|b|i|strong|em|strike)>|)/g, ''), {format : 'raw'});
			else
				ed.getDoc().execCommand('RemoveFormat', false, null);

			t.mceSetStyleInfo(0, {command : 'removeformat'});
			ed.addVisual();
		},

		mceSetStyleInfo : function(u, v) {
			var t = this, ed = t.editor, d = ed.getDoc(), dom = ed.dom, e, b, s = ed.selection, nn = v.wrapper || 'span', b = s.getBookmark(), re;

			function set(n, e) {
				if (n.nodeType == 1) {
					switch (v.command) {
						case 'setattrib':
							return dom.setAttrib(n, v.name, v.value);

						case 'setstyle':
							return dom.setStyle(n, v.name, v.value);

						case 'removeformat':
							return dom.setAttrib(n, 'class', '');
					}
				}
			};

			// Setup regexp
			re = ed.settings.merge_styles_invalid_parents;
			if (tinymce.is(re, 'string'))
				re = new RegExp(re, 'i');

			// Set style info on selected element
			if (e = t.getSelectedElement())
				set(e, 1);
			else {
				// Generate wrappers and set styles on them
				d.execCommand('FontName', false, '__');
				each(tinymce.filter(isWebKit ? dom.select('span') : dom.select('font')), function(n) {
					var sp, e;

					if (dom.getAttrib(n, 'face') == '__' || n.style.fontFamily === '__') {
						sp = dom.create(nn, {mce_new : '1'});

						set(sp);

						each (n.childNodes, function(n) {
							sp.appendChild(n.cloneNode(true));
						});

						dom.replace(sp, n);
					}
				});
			}

			// Remove wrappers inside new ones
			each(tinymce.filter(dom.select(nn)).reverse(), function(n) {
				var p = n.parentNode;

				dom.setAttrib(n, 'mce_new', '');

				// Check if it's an old span in a new wrapper
				if (!dom.getAttrib(n, 'mce_new')) {
					// Find new wrapper
					p = dom.getParent(n, function(n) {
						return n.nodeType == 1 && dom.getAttrib(n, 'mce_new');
					});

					if (p)
						dom.remove(n, 1);
				}
			});

			// Merge wrappers with parent wrappers
			each(tinymce.filter(dom.select(nn)).reverse(), function(n) {
				var p = n.parentNode;

				if (!p)
					return;

				// Has parent of the same type and only child
				if (p.nodeName == nn.toUpperCase() && p.childNodes.length == 1)
					return dom.remove(p, 1);

				// Has parent that is more suitable to have the class and only child
				if (n.nodeType == 1 && (!re || !re.test(p.nodeName)) && p.childNodes.length == 1) {
					set(p); // Set style info on parent instead
					dom.setAttrib(n, 'class', '');
				}
			});

			// Remove empty wrappers
			each(tinymce.filter(dom.select(nn)).reverse(), function(n) {
				if (!dom.getAttrib(n, 'class') && !dom.getAttrib(n, 'style'))
					return dom.remove(n, 1);
			});

			s.moveToBookmark(b);
		},

		queryStateJustify : function(c, v) {
			var ed = this.editor, n = ed.selection.getNode(), dom = ed.dom;

			if (n && n.nodeName == 'IMG')
				return dom.getStyle(n, 'float') == v;

			n = dom.getParent(ed.selection.getNode(), function(n) {
				return n.nodeType == 1 && n.style.textAlign;
			});

			if (v == 'full')
				v = 'justify';

			if (ed.settings.inline_styles)
				return (n && n.style.textAlign == v);

			return ed.getDoc().queryCommandState(c);
		},

		HiliteColor : function(ui, val) {
			var t = this, ed = t.editor;

			if (isGecko || isOpera) {
				ed.setUseCSS(true);
				ed.getDoc().execCommand('hilitecolor', false, val);
				ed.setUseCSS(false);
			} else
				ed.getDoc().execCommand('BackColor', false, val);
		},

		Undo : function() {
			var ed = this.editor;

			if (ed.settings.custom_undo_redo) {
				ed.undoManager.undo();
				ed.nodeChanged();
			} else
				ed.getDoc().execCommand('Undo', false, null);
		},

		Redo : function() {
			var ed = this.editor;

			if (ed.settings.custom_undo_redo) {
				ed.undoManager.redo();
				ed.nodeChanged();
			} else
				ed.getDoc().execCommand('Redo', false, null);
		},

		FormatBlock : function(ui, val) {
			var t = this, ed = t.editor;

			val = ed.settings.forced_root_block ? (val || '<p>') : val;
			t.mceRemoveNode();

			if (tinymce.isGecko)
				val = val.replace(/<(div|blockquote|code|dt|dd|dl|samp)>/gi, '$1');
			else if (val.indexOf('<') == -1)
				val = '<' + val + '>';

			ed.getDoc().execCommand('FormatBlock', false, val);
		},

		mceCleanup : function() {
			var ed = this.editor, s = ed.selection, b = s.getBookmark();
			ed.setContent(ed.getContent());
			s.moveToBookmark(b);
		},

		mceRemoveNode : function(ui, val) {
			var ed = this.editor, s = ed.selection, b;

			b = s.getBookmark();
			ed.dom.remove(val || s.getNode(), 1);
			s.moveToBookmark(b);
			ed.nodeChanged();
		},

		mceSelectNodeDepth : function(ui, val) {
			var ed = this.editor, s = ed.selection, c = 0;

			ed.dom.getParent(s.getNode(), function(n) {
				if (n.nodeType == 1 && c++ == val) {
					s.select(n);
					ed.nodeChanged();
					return false;
				}
			}, ed.getBody());
		},

		mceSelectNode : function(u, v) {
			this.editor.selection.select(v);
		},

		mceInsertContent : function(ui, val) {
			this.editor.selection.setContent(val);
		},

		mceInsertRawHTML : function(ui, val) {
			var ed = this.editor;

			ed.execCommand('mceInsertContent', false, 'tiny_mce_marker');
			ed.setContent(ed.getContent().replace(/tiny_mce_marker/g, val));
		},

		mceRepaint : function() {
			var s, b, e = this.editor;

			try {
				s = e.selection;
				b = s.getBookmark(true);
				e.getDoc().execCommand('selectall', false, null);
				s.collapse(true);
				s.moveToBookmark(b);
			} catch (ex) {
				// Ignore
			}
		},

		queryStateUnderline : function() {
			var ed = this.editor, n;

			if (n && n.nodeName == 'A')
				return false;

			return ed.getDoc().queryCommandState('Underline');
		},

		queryStateOutdent : function() {
			var ed = this.editor, n;

			if (ed.settings.inline_styles) {
				if ((n = ed.dom.getParent(ed.selection.getStart(), ed.dom.isBlock)) && parseInt(n.style.paddingLeft) > 0)
					return true;

				if ((n = ed.dom.getParent(ed.selection.getEnd(), ed.dom.isBlock)) && parseInt(n.style.paddingLeft) > 0)
					return true;
			} else
				return !!ed.dom.getParent(ed.selection.getNode(), 'BLOCKQUOTE');

			return this.queryStateInsertUnorderedList() || this.queryStateInsertOrderedList();
		},

		queryStateInsertUnorderedList : function() {
			return this.editor.dom.getParent(this.editor.selection.getNode(), 'UL');
		},

		queryStateInsertOrderedList : function() {
			return this.editor.dom.getParent(this.editor.selection.getNode(), 'OL');
		},

		queryStatemceBlockQuote : function() {
			return !!this.editor.dom.getParent(this.editor.selection.getStart(), function(n) {return n.nodeName === 'BLOCKQUOTE';});
		},

		mceBlockQuote : function() {
			var t = this, s = t.editor.selection, b = s.getBookmark(), bq, dom = t.editor.dom;

			function findBQ(e) {
				return dom.getParent(e, function(n) {return n.nodeName === 'BLOCKQUOTE';});
			};

			// Remove blockquote
			if (s.isCollapsed() && dom.remove(findBQ(s.getStart()), 1)) {
				t.editor.selection.moveToBookmark(b);
				return;
			}

			each(t._getSelectedBlocks(findBQ(s.getStart()), findBQ(s.getEnd())), function(e) {
				var n;

				// Found existing BQ add to this one
				if (e.nodeName == 'BLOCKQUOTE' && !bq) {
					bq = e;
					return;
				}

				// No BQ found, create one
				if (!bq) {
					bq = dom.create('blockquote');
					e.parentNode.insertBefore(bq, e);
				}

				// Add children from existing BQ
				if (e.nodeName == 'BLOCKQUOTE' && bq) {
					n = e.firstChild;

					while (n) {
						bq.appendChild(n.cloneNode(true));
						n = n.nextSibling;
					}

					dom.remove(e);

					return;
				}

				// Add non BQ element to BQ
				bq.appendChild(dom.remove(e));
			});

			t.editor.selection.moveToBookmark(b);
		},

		_getSelectedBlocks : function(st, en) {
			var ed = this.editor, dom = ed.dom, s = ed.selection, sb, eb, n, bl = [];

			sb = dom.getParent(st || s.getStart(), dom.isBlock);
			eb = dom.getParent(en || s.getEnd(), dom.isBlock);

			if (sb)
				bl.push(sb);

			if (sb && eb && sb != eb) {
				n = sb;

				while ((n = n.nextSibling) && n != eb) {
					if (dom.isBlock(n))
						bl.push(n);
				}
			}

			if (eb && sb != eb)
				bl.push(eb);

			return bl;
		}
	});
})();


/* file:jscripts/tiny_mce/classes/UndoManager.js */

(function() {
	var Dispatcher = tinymce.util.Dispatcher;

	tinymce.create('tinymce.UndoManager', {
		index : 0,
		data : null,
		typing : 0,

		UndoManager : function(ed) {
			var t = this;

			t.editor = ed;
			t.data = [];
			t.onAdd = new Dispatcher(this);
			t.onUndo = new Dispatcher(this);
			t.onRedo = new Dispatcher(this);
		},

		add : function(level) {
			var t = this, i, ed = t.editor, b, s = ed.settings;

			level = level || {};
			level.content = level.content || ed.getContent({format : 'raw', no_events : 1});

			// Add undo level if needed
			level.content = level.content.replace(/^\s*|\s*$/g, '');
			if (!level.initial && level.content == t.data[t.index > 0 ? t.index - 1 : 0].content)
				return false;

			// Time to compress
			if (s.custom_undo_redo_levels) {
				if (t.data.length > s.custom_undo_redo_levels) {
					for (i = 0; i < t.data.length - 1; i++)
						t.data[i] = t.data[i + 1];

					t.data.length--;
					t.index = t.data.length;
				}
			}

			if (s.custom_undo_redo_restore_selection)
				level.bookmark = b = level.bookmark || ed.selection.getBookmark();

			if (t.index < t.data.length && t.data[t.index].initial)
				t.index++;

			// Add level
			t.data.length = t.index + 1;
			t.data[t.index++] = level;

			if (level.initial)
				t.index = 0;

			// Set initial bookmark use first real undo level
			if (t.data.length == 2 && t.data[0].initial)
				t.data[0].bookmark = b;

			t.onAdd.dispatch(level, this);

			//console.dir(t.data);

			return true;
		},

		undo : function() {
			var t = this, ed = t.editor, level, i;

			if (t.typing) {
				t.add();
				t.typing = 0;
			}

			if (t.index > 0) {
				// If undo on last index then take snapshot
				if (t.index == t.data.length && t.index > 1) {
					i = t.index;
					t.typing = 0;

					if (!t.add())
						t.index = i;

					--t.index;
				}

				level = t.data[--t.index];
				ed.setContent(level.content, {format : 'raw'});
				ed.selection.moveToBookmark(level.bookmark);

				t.onUndo.dispatch(level, this);
			}
		},

		redo : function() {
			var t = this, ed = t.editor, level;

			if (t.index < t.data.length - 1) {
				level = t.data[++t.index];
				ed.setContent(level.content, {format : 'raw'});
				ed.selection.moveToBookmark(level.bookmark);

				t.onRedo.dispatch(level, this);
			}
		},

		clear : function() {
			var t = this;

			t.data = [];
			t.index = 0;
			t.typing = 0;
			t.add({initial : true});
		},

		hasUndo : function() {
			return this.index != 0 || this.typing;
		},

		hasRedo : function() {
			return this.index < this.data.length - 1;
		}
	});
})();
/* file:jscripts/tiny_mce/classes/ForceBlocks.js */

(function() {
	// Shorten names
	var Event, isIE, isGecko, isOpera, each, extend;

	Event = tinymce.dom.Event;
	isIE = tinymce.isIE;
	isGecko = tinymce.isGecko;
	isOpera = tinymce.isOpera;
	each = tinymce.each;
	extend = tinymce.extend;

	tinymce.create('tinymce.ForceBlocks', {
		ForceBlocks : function(ed) {
			var t = this, s;

			t.editor = ed;
			t.dom = ed.dom;

			// Default settings
			t.settings = s = extend({
				element : 'P',
				forced_root_block : 'p',
				force_p_newlines : true
			}, ed.settings);

			ed.onPreInit.add(t.setup, t);

			if (!isIE) {
				ed.onSetContent.add(function(o) {
					o.content = o.content.replace(/<p>[\s\u00a0]+<\/p>/g, '<p><br /></p>');
				});
			}

			ed.onPostProcess.add(function(o) {
				o.content = o.content.replace(/<p><\/p>/g, '<p>\u00a0</p>');

				// Use BR instead of &nbsp; padded paragraphs
				o.content = o.content.replace(/<p>\s*<br \/>\s*<\/p>/g, '<p>\u00a0</p>');
				o.content = o.content.replace(/\s*<br \/>\s*<\/p>/g, '</p>');
			});

			if (s.forced_root_block) {
				ed.onInit.add(t.forceRoots, t);
				ed.onSetContent.add(t.forceRoots, t);
				ed.onBeforeGetContent.add(t.forceRoots, t);
			}
		},

		setup : function() {
			var t = this, ed = t.editor, s = t.settings;

			// Force root blocks when typing and when getting output
			if (s.forced_root_block) {
				ed.onKeyUp.add(t.forceRoots, t);
				ed.onPreProcess.add(t.forceRoots, t);
			}

			if (s.force_br_newlines) {
				ed.onKeyPress.add(function(e) {
					var n, s = ed.selection;

					if (e.keyCode == 13) {
						s.setContent('<br id="__" /> ', {format : 'raw'});
						n = ed.dom.get('__');
						n.removeAttribute('id');
						s.select(n);
						s.collapse();
						return Event.cancel(e);
					}
				});

				return;
			}

			if (!isIE && s.force_p_newlines) {
				ed.onPreProcess.add(function(o) {
					each(o.node.getElementsByTagName('br'), function(n) {
						var p = n.parentNode;

						// Replace <p><br /></p> with <p>&nbsp;</p>
						if (p && p.nodeName == 'p' && (p.childNodes.length == 1 || p.lastChild == n))
							p.replaceChild(ed.getDoc().createTextNode('\u00a0'), n);
					});
				});

				ed.onKeyPress.add(function(e) {
					if (e.keyCode == 13 && !e.shiftKey) {
						if (!t.insertPara(e))
							Event.cancel(e);
					}
				});

				if (isGecko) {
					ed.onKeyDown.add(function(e) {
						if ((e.keyCode == 8 || e.keyCode == 46) && !e.shiftKey)
							t.backspaceDelete(e, e.keyCode == 8);
					});
				}
			}
		},

		find : function(n, t, s) {
			var ed = this.editor, w = ed.getDoc().createTreeWalker(n, 4, null, false), c = -1;

			while (n = w.nextNode()) {
				c++;

				// Index by node
				if (t == 0 && n == s)
					return c;

				// Node by index
				if (t == 1 && c == s)
					return n;
			}

			return -1;
		},

		forceRoots : function() {
			var t = this, ed = t.editor, b = ed.getBody(), d = ed.getDoc(), se = ed.selection, s = se.getSel(), r = se.getRng(), si = -2, ei, so, eo, tr, c = -0xFFFFFF;
			var ne = b.firstChild, nx, bl, bp, sp, le, nl = b.childNodes, i;

			// Wrap non blocks into blocks
			for (i = nl.length - 1; i >= 0; i--) {
				nx = nl[i];

				// Is text or non block element
				if (ne.nodeType == 3 || !t.dom.isBlock(ne)) {
					if (!bl) {
						// Create new block but ignore whitespace
						if (ne.nodeType != 3 || /[^\s]/g.test(ne.nodeValue)) {
							// Store selection
							if (si == -2 && r) {
								if (!isIE) {
									so = r.startOffset;
									eo = r.endOffset;
									si = t.find(b, 0, r.startContainer);
									ei = t.find(b, 0, r.endContainer);
								} else {
									tr = b.createTextRange();
									tr.moveToElementText(b);
									tr.collapse(1);
									bp = tr.move('character', c) * -1;

									tr = r.duplicate();
									tr.collapse(1);
									sp = tr.move('character', c) * -1;

									tr = r.duplicate();
									tr.collapse(0);
									le = (tr.move('character', c) * -1) - sp;

									si = sp - bp;
									ei = le;
								}
							}

							bl = ed.dom.create(t.settings.forced_root_block);
							bl.appendChild(ne.cloneNode(1));
							b.replaceChild(bl, ne);
						}
					} else
						bl.appendChild(ne);
				} else
					bl = null; // Time to create new block
			}

			// Restore selection
			if (si != -2) {
				if (!isIE) {
					bl = d.getElementsByTagName(t.settings.element)[0];
					r = d.createRange();

					// Select last location or generated block
					if (si != -1)
						r.setStart(t.find(b, 1, si), so);
					else
						r.setStart(bl, 0);

					// Select last location or generated block
					if (ei != -1)
						r.setEnd(t.find(b, 1, ei), eo);
					else
						r.setEnd(bl, 0);

					s.removeAllRanges();
					s.addRange(r);
				} else {
					try {
						r = s.createRange();
						r.moveToElementText(b);
						r.collapse(1);
						r.moveStart('character', si);
						r.moveEnd('character', ei);
						r.select();
					} catch (ex) {
						// Ignore
					}
				}
			}
		},

		getParentBlock : function(n) {
			var d = this.dom;

			return d.getParent(n, d.isBlock);
		},

		insertPara : function(e) {
			var t = this, ed = t.editor, d = ed.getDoc(), se = t.settings, s = ed.selection.getSel(), r = s.getRangeAt(0), b = d.body;
			var rb, ra, dir, sn, so, en, eo, sb, eb, bn, bef, aft, sc, ec, n;

			function isEmpty(n) {
				n = n.innerHTML;
				n = n.replace(/<img|hr|table/g, 'd'); // Keep these
				n = n.replace(/<[^>]+>/g, ''); // Remove all tags

				return n.replace(/[ \t\r\n]+/g, '') == '';
			};

			// If root blocks are forced then use Operas default behavior since it's really good
			if (se.forced_root_block && isOpera)
				return true;

			// Setup before range
			rb = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			rb.setStart(s.anchorNode, s.anchorOffset);
			rb.collapse(true);

			// Setup after range
			ra = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			ra.setStart(s.focusNode, s.focusOffset);
			ra.collapse(true);

			// Setup start/end points
			dir = rb.compareBoundaryPoints(rb.START_TO_END, ra) < 0;
			sn = dir ? s.anchorNode : s.focusNode;
			so = dir ? s.anchorOffset : s.focusOffset;
			en = dir ? s.focusNode : s.anchorNode;
			eo = dir ? s.focusOffset : s.anchorOffset;

			// If the caret is in an invalid location in FF we need to move it into the first block
			if (sn == b && en == b && b.firstChild && ed.dom.isBlock(b.firstChild)) {
				sn = en = sn.firstChild;
				so = eo = 0;
				rb = d.createRange();
				rb.setStart(sn, 0);
				ra = d.createRange();
				ra.setStart(en, 0);
			}

			// Never use body as start or end node
			sn = sn.nodeName == "BODY" ? sn.firstChild : sn;
			en = en.nodeName == "BODY" ? en.firstChild : en;

			// Get start and end blocks
			sb = t.getParentBlock(sn);
			eb = t.getParentBlock(en);
			bn = sb ? sb.nodeName : se.element; // Get block name to create

			// Return inside list use default browser behavior
			if (t.dom.getParent(sb, function(n) { return /OL|UL|PRE/.test(n.nodeName); }))
				return true;

			// If caption or absolute layers then always generate new blocks within
			if (sb && (sb.nodeName == 'CAPTION' || /absolute|relative|static/gi.test(sb.style.position))) {
				bn = se.element;
				sb = null;
			}

			// If caption or absolute layers then always generate new blocks within
			if (eb && (eb.nodeName == 'CAPTION' || /absolute|relative|static/gi.test(eb.style.position))) {
				bn = se.element;
				eb = null;
			}

			// Use P instead
			if (/(TD|TABLE|TH|CAPTION)/.test(bn) || (sb && bn == "DIV" && /left|right/gi.test(sb.style.cssFloat))) {
				bn = se.element;
				sb = eb = null;
			}

			// Setup new before and after blocks
			bef = (sb && sb.nodeName == bn) ? sb.cloneNode(0) : ed.dom.create(bn);
			aft = (eb && eb.nodeName == bn) ? eb.cloneNode(0) : ed.dom.create(bn);

			// Remove id from after clone
			aft.removeAttribute('id');

			// Is header and cursor is at the end, then force paragraph under
			if (/^(H[1-6])$/.test(bn) && sn.nodeValue && so == sn.nodeValue.length)
				aft = ed.dom.create(se.element);

			// Find start chop node
			n = sc = sn;
			do {
				if (n == b || n.nodeType == 9 || t.dom.isBlock(n) || /(TD|TABLE|TH|CAPTION)/.test(n.nodeName))
					break;

				sc = n;
			} while ((n = n.previousSibling ? n.previousSibling : n.parentNode));

			// Find end chop node
			n = ec = en;
			do {
				if (n == b || n.nodeType == 9 || t.dom.isBlock(n) || /(TD|TABLE|TH|CAPTION)/.test(n.nodeName))
					break;

				ec = n;
			} while ((n = n.nextSibling ? n.nextSibling : n.parentNode));

			// Place first chop part into before block element
			if (sc.nodeName == bn)
				rb.setStart(sc, 0);
			else
				rb.setStartBefore(sc);

			rb.setEnd(sn, so);
			bef.appendChild(rb.cloneContents());

			// Place secnd chop part within new block element
			try {
				ra.setEndAfter(ec);
			} catch(ex) {
				//console.debug(s.focusNode, s.focusOffset);
			}

			ra.setStart(en, eo);
			aft.appendChild(ra.cloneContents());

			// Create range around everything
			r = d.createRange();
			if (!sc.previousSibling && sc.parentNode.nodeName == bn) {
				r.setStartBefore(sc.parentNode);
			} else {
				if (rb.startContainer.nodeName == bn && rb.startOffset == 0)
					r.setStartBefore(rb.startContainer);
				else
					r.setStart(rb.startContainer, rb.startOffset);
			}

			if (!ec.nextSibling && ec.parentNode.nodeName == bn)
				r.setEndAfter(ec.parentNode);
			else
				r.setEnd(ra.endContainer, ra.endOffset);

			// Delete and replace it with new block elements
			r.deleteContents();

			// Never wrap blocks in blocks
			if (bef.firstChild && bef.firstChild.nodeName == bn)
				bef.innerHTML = bef.firstChild.innerHTML;

			if (aft.firstChild && aft.firstChild.nodeName == bn)
				aft.innerHTML = aft.firstChild.innerHTML;

			// Padd empty blocks
			if (isEmpty(bef))
				bef.innerHTML = '<br />';

			if (isEmpty(aft))
				aft.innerHTML = isOpera ? ' <br />' : '<br />'; // Extra space for Opera

			// Opera needs this one backwards
			if (isOpera) {
				r.insertNode(bef);
				r.insertNode(aft);
			} else {
				r.insertNode(aft);
				r.insertNode(bef);
			}

			// Normalize
			aft.normalize();
			bef.normalize();

			// Move cursor and scroll into view
			r = d.createRange();
			r.selectNodeContents(aft);
			r.collapse(1);
			s.removeAllRanges();
			s.addRange(r);
			aft.scrollIntoView(0);

			return false;
		},

		backspaceDelete : function(e, bs) {
			var t = this, ed = t.editor, b = ed.getBody(), n, se = ed.selection, r = se.getRng(), sc = r.startContainer, n;

			// The caret sometimes gets stuck in Gecko if you delete empty paragraphs
			// This workaround removes the element by hand and moves the caret to the previous element
			if (sc && ed.dom.isBlock(sc) && bs) {
				if (sc.childNodes.length == 1 && sc.firstChild.nodeName == 'BR') {
					n = sc.previousSibling;
					if (n) { 
						ed.dom.remove(sc);
						se.select(n, 1);
						se.collapse(0);
						return Event.cancel(e);
					}
				}
			}

			// Gecko generates BR elements here and there, we don't like those so lets remove them
			function handler(e) {
				e = e.target;

				// A new BR was created in a block element, remove it
				if (e && e.parentNode && e.nodeName == 'BR' && t.getParentBlock(e)) {
					ed.dom.remove(e);
					Event.remove(b, 'DOMNodeInserted', handler);
				}
			};

			// Listen for new nodes
			Event._add(b, 'DOMNodeInserted', handler);

			// Remove listener
			window.setTimeout(function() {
				Event._remove(b, 'DOMNodeInserted', handler);
			}, 1);
		}
	});
})();

/* file:jscripts/tiny_mce/classes/ControlManager.js */

(function() {
	// Shorten names
	var DOM = tinymce.DOM, Event = tinymce.dom.Event, each = tinymce.each, extend = tinymce.extend;

	tinymce.create('tinymce.ControlManager', {
		ControlManager : function(ed, s) {
			var t = this, i;

			s = s || {};
			t.editor = ed;
			t.controls = {};
			t.onAdd = new tinymce.util.Dispatcher(t);
			t.onPostRender = new tinymce.util.Dispatcher(t);
			t.prefix = s.prefix || ed.id + '_';

			t.onPostRender.add(function() {
				each(t.controls, function(c) {
					c.postRender();
				});
			});
		},

		get : function(id) {
			return this.controls[this.prefix + id] || this.controls[id];
		},

		setActive : function(id, s) {
			var c;

			if (c = this.get(id))
				c.setActive(s);
		},

		setDisabled : function(id, s) {
			var c;

			if (c = this.get(id))
				c.setDisabled(s);
		},

		add : function(c) {
			var t = this;

			if (c) {
				t.controls[c.id] = c;
				t.onAdd.dispatch(c, t);
			}

			return c;
		},

		createControl : function(n) {
			var c, t = this, ed = t.editor;

			switch (n) {
				case "|":
				case "separator":
					return this.createSeparator();
			}

			each(this.editor.plugins, function(p) {
				if (p.createControl) {
					c = p.createControl(n, t);

					if (c)
						return false;
				}
			});

			if (!c && ed.buttons && (c = ed.buttons[n]))
				return t.createButton(n, c.title, c.cmd, c.settings.scope || ed, c.settings);

			return t.add(c);
		},

		createDropMenu : function(id, s) {
			var t = this, ed = t.editor, c;

			s = extend({
				container : ed.getContainer()
			}, s);

			id = t.prefix + id;
			c = t.controls[id] = new tinymce.ui.DropMenu(id, s);
			c.onAddItem.add(function(o) {
				var s = o.settings;

				s.title = ed.getLang(s.title, s.title);

				if (s.command)
					s.func = t._wrap(s);
			});

			return t.add(c);
		},

		createListBox : function(id, title, cmd_func, scope, s) {
			var t = this, ed = t.editor, cmd, c;

			if (t.get(id))
				return null;

			title = ed.translate(title);
			scope = scope || ed;

			s = extend({
				title : title,
				'class' : id,
				func : t._wrap(cmd_func, 1),
				scope : scope,
				menu_container : ed.id + "_parent",
				control_manager : t
			}, s);

			id = t.prefix + id;

			if (ed.settings.use_native_selects)
				c = new tinymce.ui.NativeListBox(id, s);
			else
				c = new tinymce.ui.ListBox(id, s);

			t.controls[id] = c;

			// Fix focus problem in Safari
			if (tinymce.isWebKit) {
				c.onPostRender.add(function(n) {
					// Store bookmark on mousedown
					Event.add(n, 'mousedown', function() {
						ed.bookmark = ed.selection.getBookmark(1);
					});

					// Restore on focus, since it might be lost
					Event.add(n, 'focus', function() {
						ed.selection.moveToBookmark(ed.bookmark);
						ed.bookmark = null;
					});
				});
			}

			if (c.hideMenu)
				ed.onMouseDown.add(c.hideMenu, c);

			return t.add(c);
		},

		createButton : function(id, title, cmd_func, scope, s) {
			var t = this, ed = t.editor, o;

			if (t.get(id))
				return null;

			title = ed.translate(title);
			scope = scope || ed;

			s = extend({
				title : title,
				'class' : id,
				func : t._wrap(cmd_func),
				scope : scope
			}, s);

			id = t.prefix + id;

			return t.add(new tinymce.ui.Button(id, s));
		},

		createSplitButton : function(id, title, cmd_func, scope, s) {
			var t = this, ed = t.editor, cmd, c;

			if (t.get(id))
				return null;

			title = ed.translate(title);
			scope = scope || ed;

			s = extend({
				title : title,
				'class' : id,
				func : t._wrap(cmd_func, 1),
				scope : scope,
				menu_container : ed.id + "_parent",
				control_manager : t
			}, s);

			id = t.prefix + id;
			c = t.add(new tinymce.ui.SplitButton(id, s));
			ed.onMouseDown.add(c.hideMenu, c);

			return c;
		},

		createColorSplitButton : function(id, title, cmd_func, scope, s) {
			var t = this, ed = t.editor, cmd, c;

			if (t.get(id))
				return null;

			title = ed.translate(title);
			scope = scope || ed;

			s = extend({
				title : title,
				'class' : id,
				func : t._wrap(cmd_func, 1),
				scope : scope,
				menu_container : ed.id + "_parent"
			}, s);

			id = t.prefix + id;
			c = new tinymce.ui.ColorSplitButton(id, s);
			ed.onMouseDown.add(c.hideMenu, c);

			return t.add(c);
		},

		createToolbar : function(id, s) {
			var c = new tinymce.ui.Toolbar(id, s);

			if (this.get(id))
				return null;

			return this.add(c);
		},

		createSeparator : function() {
			return new tinymce.ui.Separator();
		},

		_wrap : function(c, v) {
			var o, ed = this.editor;

			// Wrap command
			if (tinymce.is(c, 'string'))
				c = {command : c};

			if (tinymce.is(c, 'object')) {
				o = c;

				if (v) {
					c = function(v) {
						ed.execCommand(o.command, o.ui, v);
					};
				} else {
					c = function(e) {
						ed.execCommand(o.command, o.ui, o.value);
						return Event.cancel(e);
					};
				}
			}

			return c;
		}
	});
})();

/* file:jscripts/tiny_mce/classes/WindowManager.js */

(function() {
	var Dispatcher = tinymce.util.Dispatcher, each = tinymce.each, isIE = tinymce.isIE, isOpera = tinymce.isOpera;

	tinymce.create('tinymce.WindowManager', {
		WindowManager : function(ed) {
			var t = this;
			t.editor = ed;
			t.onOpen = new tinymce.util.Dispatcher(t);
			t.onClose = new tinymce.util.Dispatcher(t);
			t.params = {};
			t.features = {};
		},

		open : function(s, p) {
			var f = '', x, y, mo = this.editor.settings.dialog_type == 'modal', w, sw, sh, vp = tinymce.DOM.getViewPort();

			// Default some options
			s = s || {};
			p = p || {};
			sw = isOpera ? vp.w : screen.width; // Opera uses windows inside the Opera window
			sh = isOpera ? vp.h : screen.height;
			s.name = s.name || 'mc_' + new Date().getTime();
			s.width = parseInt(s.width || 320);
			s.height = parseInt(s.height || 240);
			s.resizable = true;
			s.left = s.left || parseInt(sw / 2.0) - (s.width / 2.0);
			s.top = s.top || parseInt(sh / 2.0) - (s.height / 2.0);
			p.inline = false;
			p.mce_width = s.width;
			p.mce_height = s.height;

			if (mo) {
				if (isIE) {
					s.center = true;
					s.help = false;
					s.dialogWidth = s.width + 'px';
					s.dialogHeight = s.height + 'px';
					s.scroll = s.scrollbars || false;
				} else
					s.modal = s.alwaysRaised = s.dialog = s.centerscreen = s.dependent = true;
			}

			// Build features string
			each(s, function(v, k) {
				if (tinymce.is(v, 'boolean'))
					v = v ? 'yes' : 'no';

				if (!/^(name|url)$/.test(k)) {
					if (isIE && mo)
						f += (f ? ';' : '') + k + ':' + v;
					else
						f += (f ? ',' : '') + k + '=' + v;
				}
			});

			this.features = s;
			this.params = p;
			this.onOpen.dispatch(s, p);

			try {
				if (isIE && mo) {
					w = 1;
					window.showModalDialog(s.url || s.file, window, f);
				} else
					w = window.open(s.url || s.file, s.name, f);
			} catch (ex) {
				// Ignore
			}

			if (!w)
				alert(this.editor.getLang('popup_blocked'));
		},

		close : function(w) {
			w.close();
			t.onClose.dispatch();
		},

		setTitle : function(v) {
		},

		getParam : function(n, dv) {
			var v = this.params[n];

			return tinymce.is(v) ? v : dv;
		},

		getFeature : function(n, dv) {
			return this.features[n] || dv;
		},

		createDOM : function(doc, s) {
			return new tinymce.dom.DOMUtils(doc, s);
		},

		confirm : function(t, cb, s) {
			cb.call(s || this, confirm(this._decode(this.editor.getLang(t, t))));
		},

		alert : function(t, cb, s) {
			alert(this._decode(t));

			if (cb)
				cb.call(s || this);
		},

		_decode : function(s) {
			return tinymce.DOM.decode(s).replace(/\\n/g, '\n');
		}
	});
}());