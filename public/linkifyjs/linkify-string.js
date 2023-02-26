var linkifyStr = (function (linkifyjs) {
    "use strict";

    /**
		Convert strings of text into linkable HTML text
	*/
    function escapeText(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    function escapeAttr(href) {
        return href.replace(/"/g, "&quot;");
    }
    function attributesToString(attributes) {
        const result = [];
        for (const attr in attributes) {
            let val = attributes[attr] + "";
            result.push(`${attr}="${escapeAttr(val)}"`);
        }
        return result.join(" ");
    }
    function defaultRender(_ref) {
        let { tagName, attributes, content } = _ref;
        return `<${tagName} ${attributesToString(attributes)}>${escapeText(
            content
        )}</${tagName}>`;
    }

    /**
     * Convert a plan text string to an HTML string with links. Expects that the
     * given strings does not contain any HTML entities. Use the linkify-html
     * interface if you need to parse HTML entities.
     *
     * @param {string} str string to linkify
     * @param {import('linkifyjs').Opts} [opts] overridable options
     * @returns {string}
     */
    function linkifyStr(str, opts) {
        if (opts === void 0) {
            opts = {};
        }
        opts = new linkifyjs.Options(opts, defaultRender);
        const tokens = linkifyjs.tokenize(str);
        const result = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.t === "nl" && opts.get("nl2br")) {
                result.push("<br>\n");
            } else if (!token.isLink || !opts.check(token)) {
                result.push(escapeText(token.toString()));
            } else {
                result.push(opts.render(token));
            }
        }
        return result.join("");
    }
    if (!String.prototype.linkify) {
        Object.defineProperty(String.prototype, "linkify", {
            writable: false,
            value: function linkify(options) {
                return linkifyStr(this, options);
            }
        });
    }

    return linkifyStr;
})(linkify);
