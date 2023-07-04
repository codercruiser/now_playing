const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
const port = 3001;
const tracksPerPage = 12; // Number of tracks to display per page
let lastPlayedSong = '';
let lastPlayedSongCoverArt = '';
let trackHistory = getTrackHistoryFromFile(); // Retrieve track history from file

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the current page number from the query parameter

  // Calculate the start and end indices for the tracks to display on the current page
  const startIndex = (page - 1) * tracksPerPage;
  const endIndex = startIndex + tracksPerPage;

  // Get the tracks for the current page
  const paginatedTrackHistory = trackHistory.slice(startIndex, endIndex).map(track => {
    const words = track.nowplaying.split(' ');
    const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    const capitalizedTitle = capitalizedWords.join(' ');
    return {
      nowplaying: capitalizedTitle,
      coverart: track.coverart
    };
  });

  axios
    .get('https://mediacp.audiostreamen.nl:2000/json/stream/hitsfoto')
    .then(response => {
      const data = response.data;
      const currentSong = data.nowplaying.trim().toLowerCase();

      if (currentSong !== lastPlayedSong.trim().toLowerCase()) {
        const track = {
          nowplaying: lastPlayedSong,
          coverart: lastPlayedSongCoverArt
        };

        // Check if the track already exists in the track history
        const existingTrackIndex = trackHistory.findIndex(
          t => t.nowplaying.trim().toLowerCase() === track.nowplaying.trim().toLowerCase()
        );

        if (existingTrackIndex === -1 && track.nowplaying !== '') {
          if (trackHistory.length >= 300) {
            trackHistory.pop(); // Remove the oldest track if the history reaches 300
          }
          trackHistory.unshift(track);
          saveTrackHistoryToFile(trackHistory); // Save track history to file
        }

        // Update last played song and cover art
        lastPlayedSong = currentSong;
        lastPlayedSongCoverArt = data.coverart;
      }

      const totalPages = Math.ceil(trackHistory.length / tracksPerPage); // Calculate the total number of pages

      res.render('index', { data, paginatedTrackHistory, page, totalPages });
    })
    .catch(error => {
      console.log('Error:', error);
      res.render('error');
    });
});

// Refresh track data every 30 seconds
setInterval(() => {
  axios
    .get('https://mediacp.audiostreamen.nl:2000/json/stream/hitsfoto')
    .then(response => {
      const data = response.data;
      const currentSong = data.nowplaying.trim().toLowerCase();

      if (currentSong !== lastPlayedSong.trim().toLowerCase()) {
        const track = {
          nowplaying: lastPlayedSong,
          coverart: lastPlayedSongCoverArt
        };

        // Check if the track already exists in the track history
        const existingTrackIndex = trackHistory.findIndex(
          t => t.nowplaying.trim().toLowerCase() === track.nowplaying.trim().toLowerCase()
        );

        if (existingTrackIndex === -1 && track.nowplaying !== '') {
          if (trackHistory.length >= 300) {
            trackHistory.pop(); // Remove the oldest track if the history reaches 300
          }
          trackHistory.unshift(track);
          saveTrackHistoryToFile(trackHistory); // Save track history to file
        }

        // Update last played song and cover art
        lastPlayedSong = currentSong;
        lastPlayedSongCoverArt = data.coverart;

        console.log('New Song Found:', currentSong);
      }
    })
    .catch(error => {
      console.log('Error:', error);
    });
}, 30000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

function getTrackHistoryFromFile() {
  try {
    const trackHistoryJson = fs.readFileSync('trackHistory.json');
    return JSON.parse(trackHistoryJson);
  } catch (error) {
    console.log('Error reading track history file:', error);
    return [];
  }
}

function saveTrackHistoryToFile(trackHistory) {
  try {
    const trackHistoryJson = JSON.stringify(trackHistory);
    fs.writeFileSync('trackHistory.json', trackHistoryJson);
  } catch (error) {
    console.log('Error saving track history file:', error);
  }
}
