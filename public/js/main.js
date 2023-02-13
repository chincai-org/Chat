const choice1 = document.getElementById("choice-1");
const choice2 = document.getElementById("choice-2");
const textbox = document.getElementById("text");

textbox.addEventListener("keydown", e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        sendMessage("<msg>");
    }
});

function sendMessage(msg) {
    //TODO return msg
    pass
}

choice1.onclick = () => {
    choice1.classList.add("clicked");
    if (choice2.classList.contains("clicked")) {
        choice2.classList.remove("clicked");
    }
};

choice2.onclick = () => {
    choice2.classList.add("clicked");
    if (choice1.classList.contains("clicked")) {
        choice1.classList.remove("clicked");
    }
};

$("#text")
    .each(function () {
        this.setAttribute(
            "style",
            "height:" +
                (this.scrollHeight / window.innerHeight) * 100 +
                "vh;overflow-y:scroll;"
        );
    })
    .on("input", function () {
        this.style.height = "auto";
        if (this.scrollHeight > window.innerHeight / 2) {
            this.style.height = "48.844375963020035vh";
            $(".chat").css("height", "43.29738058551618vh");
        } else {
            this.style.height =
                (this.scrollHeight / window.innerHeight) * 100 + "vh";
            $(".chat").css(
                "height",
                ((window.innerHeight - this.scrollHeight) /
                    window.innerHeight) *
                    100 -
                    (53 / window.innerHeight) * 100 +
                    "vh"
            );
        }
    });
