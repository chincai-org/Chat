function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

const cookieId = getCookie("id");

$.ajax({
    url: "/get_user_by_cookie_id",
    type: "POST",
    data: {
        id: cookieId
    },
    success: response => {
        document.getElementById("username").innerText = response.displayName;
    },
    error: (xhr, status, error) => {
        console.log("Error: " + error);
    }
});
