function getCookie(cname) {
	const name = `${cname}=`;
	const decodedCookie = decodeURIComponent(document.cookie);
	const ca = decodedCookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") {
			c = c.substring(1);
		}
		if (c.startsWith(name)) {
			return c.substring(name.length);
		}
	}
	return "";
}

const _cookieId = getCookie("id");
