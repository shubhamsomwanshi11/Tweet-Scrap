// Function to fetch tweet data using XMLHttpRequest
function fetchTweetData(tweetUrl) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:9860/api/getTweet', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.tweetData); 
                } else {
                    reject(`HTTP error! status: ${xhr.status}`);
                }
            }
        };

        xhr.onerror = function () {
            reject('Error fetching tweet data');
        };

        // Send the tweet URL as JSON
        xhr.send(JSON.stringify({ tweetUrl }));
    });
}

// Call the function when the button is clicked
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('getRes').addEventListener("click", () => {
        const link = document.getElementById('link').value.trim();
        fetchTweetData(link)
            .then(response => {
                document.getElementById('jsonContainer').value = response; // Display the response in the textarea
            })
            .catch(error => {
                console.error(error);
                document.getElementById('jsonContainer').value = `Error: ${error}`; // Display error in the textarea
            });
    });
});
