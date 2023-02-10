const choice1 = document.getElementById("choice-1");
const choice2 = document.getElementById("choice-2");
const screenHeight = screen.height;

choice1.onclick = () => {
    choice1.classList.add("clicked");
    choice2.classList.remove("clicked");
};

choice2.onclick = () => {
    choice2.classList.add("clicked");
    choice1.classList.remove("clicked");
};

$('textarea').each(function () {
  this.setAttribute('style', 'height:' + (this.scrollHeight / window.innerHeight * 100) + 'vh;overflow-y:scroll;');
}).on('input', function () {
  this.style.height = 'auto';
  if (this.scrollHeight > window.innerHeight / 7) { // Maximum height of 50% of the viewport height
    this.style.height = '14.2vh';
  } else {
    this.style.height = (this.scrollHeight / window.innerHeight * 100) + 'vh';
  }
});