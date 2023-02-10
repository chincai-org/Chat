const choice1 = document.getElementById("choice-1");
const choice2 = document.getElementById("choice-2");
const screenHeight = screen.height;

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
        if (this.scrollHeight > window.innerHeight / 6) {
            this.style.height = "16.6vh";
        } else {
            this.style.height =
                (this.scrollHeight / window.innerHeight) * 100 + "vh";
        }
    });
