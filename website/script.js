// Function to scroll the content down once after the page loads
function scrollDownOnce() {
  const rectangle = document.querySelector(".rectangle");
  rectangle.scrollTop = rectangle.scrollHeight;
}

// Add the scrollDownOnce function to the load event
window.addEventListener("load", scrollDownOnce);

// Countdown timer function to update the title every second
function updateTitle() {
  let remainingSeconds = 60;
  const title = document.title;
  document.title = `(${remainingSeconds}s) ${title}`;

  const countdownInterval = setInterval(() => {
    remainingSeconds--;
    document.title = `(${remainingSeconds}s) ${title}`;

    if (remainingSeconds === 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Call the updateTitle function when the page loads
window.addEventListener("load", updateTitle);
