const navigation = document.querySelector(".navigation");
const navigationHeight = navigation.offsetHeight;

document.documentElement.style.setProperty(
    "--scroll-padding",
    navigationHeight + "px"
);
