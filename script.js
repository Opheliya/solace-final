window.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const body = document.body;

  const playBtn = document.getElementById('play');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const progress = document.getElementById('progress');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const title = document.querySelector('.title');
  const artist = document.querySelector('.artist');

  const artContainer = document.querySelector('.art-container');
  const artImg = document.querySelector('.art');
  let artVideo = null;

  const searchBtn = document.getElementById('search-btn');
  const songSearchInput = document.getElementById('song-search');
  const searchResultsDiv = document.getElementById('search-results');

  const moodButtons = document.querySelectorAll('.mood-buttons button');
  const languageSelect = document.getElementById('language-select');
  const lyricsPre = document.getElementById('lyrics');
  const voiceSearchBtn = document.getElementById('voice-search-btn');

  const moodToggleCheckbox = document.getElementById('mood-toggle');
  const moodToggleStatus = document.getElementById('mood-toggle-status');
  let moodLoopMode = false;

  const sharePlaylistBtn = document.getElementById('share-playlist-btn');
  const shareStatus = document.getElementById('share-status');
  const timelineList = document.getElementById('timeline-list');

  const playlistSelect = document.getElementById('playlist-select');
  const addPlaylistBtn = document.getElementById('add-playlist-btn');
  const loopPlaylistBtn = document.getElementById('loop-playlist-btn');
  let loopActive = false;

  const emojiContainer = document.createElement('div');
  emojiContainer.id = 'emoji-container';
  document.body.appendChild(emojiContainer);
  let emojiIntervalId = null;

  let isPlaying = false;
  let audio = new Audio();
  let songs = [];
  let currentSongIndex = 0;
  let currentMood = '';
  let songPlayHistory = [];

  let allPlaylists = {"My Playlist": []};
  let currentPlaylist = "My Playlist";

  const sampleSongVideos = {
    1440857781: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    1440833107: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
  };

  const moodSearchMap = {
    happy: ['happy', 'joy', 'bright', 'summer', 'upbeat'],
    sad: ['sad', 'blues', 'melancholy', 'heartbreak', 'mournful'],
    chill: ['chill', 'relaxing', 'calm', 'mellow', 'smooth'],
    energetic: ['energetic', 'party', 'dance', 'upbeat', 'workout'],
  };

  const moodBackgrounds = {
    happy: 'url("https://source.unsplash.com/1600x900/?happy")',
    sad: 'url("https://source.unsplash.com/1600x900/?sad")',
    chill: 'url("https://source.unsplash.com/1600x900/?chill")',
    energetic: 'url("https://source.unsplash.com/1600x900/?energetic")',
    default: 'url("https://source.unsplash.com/1600x900/?music")',
  };

  function createEmoji(char) {
    const emoji = document.createElement('div');
    emoji.textContent = char;
    emoji.className = 'emoji';
    emoji.style.left = (Math.random() * 100) + 'vw';
    emoji.style.animationDuration = (5 + Math.random() * 4) + 's';
    emoji.style.fontSize = (20 + Math.random() * 20) + 'px';
    emojiContainer.appendChild(emoji);
    setTimeout(() => {
      emoji.remove();
    }, 9000);
  }

  function startEmojiAnimation(mood) {
    clearInterval(emojiIntervalId);
    emojiContainer.innerHTML = '';
    if (mood === 'happy') {
      emojiIntervalId = setInterval(() => {
        createEmoji('😊');
        createEmoji('😄');
      }, 700);
    } else if (mood === 'sad') {
      emojiIntervalId = setInterval(() => {
        createEmoji('😢');
      }, 1200);
    } else {
      emojiIntervalId = null;
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('light-theme')) {
      body.classList.replace('light-theme', 'dark-theme');
      themeToggleBtn.textContent = 'Switch to Light';
    } else {
      body.classList.replace('dark-theme', 'light-theme');
      themeToggleBtn.textContent = 'Switch to Dark';
    }
  });

  moodToggleCheckbox.addEventListener('change', () => {
    moodLoopMode = moodToggleCheckbox.checked;
    moodToggleStatus.textContent = moodLoopMode ? 'ON' : 'OFF';
  });

  function updateMoodBackground(mood) {
    body.style.backgroundImage = moodBackgrounds[mood] || moodBackgrounds.default;
  }

  function setArtMedia(song) {
    if (artVideo) {
      artVideo.pause();
      artContainer.removeChild(artVideo);
      artVideo = null;
    }
    artImg.style.display = 'none';
    const videoUrl = sampleSongVideos[song.id];
    if (videoUrl) {
      artVideo = document.createElement('video');
      artVideo.src = videoUrl;
      artVideo.autoplay = true;
      artVideo.loop = true;
      artVideo.muted = true;
      artVideo.playsInline = true;
      artVideo.style.width = '100%';
      artVideo.style.borderRadius = '28px';
      artContainer.appendChild(artVideo);
    } else {
      artImg.style.display = 'block';
      artImg.src = song.img || 'default-album.jpg';
    }
  }

  function addSongToTimeline(song) {
    const now = new Date();
    songPlayHistory = songPlayHistory.filter(item => item.id !== song.id);
    songPlayHistory.push({ ...song, time: now.toISOString() });
    updateTimeline();
  }

  function updateTimeline() {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSongs = songPlayHistory.filter(item => new Date(item.time).getTime() >= oneMonthAgo).reverse();
    timelineList.innerHTML = '';
    recentSongs.forEach(item => {
      const when = new Date(item.time);
      const formatted = when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const li = document.createElement('li');
      li.textContent = `${item.title} - ${item.artist} (played: ${formatted})`;
      timelineList.appendChild(li);
    });
  }

  function loadSong(song) {
    title.textContent = song.title;
    artist.textContent = song.artist || 'Unknown Artist';
    setArtMedia(song);
    audio.src = song.src;
    fetchLyrics(song.artist, song.title);
    updateMoodBackground(currentMood);
    addSongToTimeline(song);
  }

  async function fetchLyrics(artistName, trackName) {
    lyricsPre.textContent = 'Loading lyrics...';
    if (!artistName || !trackName) {
      lyricsPre.textContent = 'Lyrics unavailable.';
      return;
    }
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`);
      if (!response.ok) throw new Error('Lyrics not found');
      const data = await response.json();
      lyricsPre.textContent = data.lyrics || 'Lyrics not found.';
    } catch {
      lyricsPre.textContent = 'Lyrics not found.';
    }
  }

  function playSong() {
    isPlaying = true;
    playBtn.textContent = '⏸️';
    audio.play();
  }

  function pauseSong() {
    isPlaying = false;
    playBtn.textContent = '▶️';
    audio.pause();
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) pauseSong();
    else playSong();
  });

  prevBtn.addEventListener('click', () => {
    if (loopActive && allPlaylists[currentPlaylist]?.length) {
      playFromPlaylist(currentSongIndex - 1);
    } else if (songs.length) {
      currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
      loadSong(songs[currentSongIndex]);
      playSong();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (loopActive && allPlaylists[currentPlaylist]?.length) {
      playFromPlaylist(currentSongIndex + 1);
    } else if (songs.length) {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
      loadSong(songs[currentSongIndex]);
      playSong();
    }
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progress.value = progressPercent;
    let curM = Math.floor(audio.currentTime / 60);
    let curS = Math.floor(audio.currentTime % 60);
    let durM = Math.floor(audio.duration / 60);
    let durS = Math.floor(audio.duration % 60);
    currentTimeEl.textContent = `${curM}:${curS < 10 ? '0' : ''}${curS}`;
    durationEl.textContent = `${durM}:${durS < 10 ? '0' : ''}${durS}`;
  });

  progress.addEventListener('input', () => {
    audio.currentTime = (progress.value / 100) * audio.duration;
  });

  moodButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentMood = button.getAttribute('data-mood');
      body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
      body.classList.add('mood-' + currentMood);
      updateMoodBackground(currentMood);
      searchSongs();
      startEmojiAnimation(currentMood);
    });
  });

  searchBtn.addEventListener('click', () => {
    currentMood = '';
    body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
    updateMoodBackground('');
    searchSongs();
    clearInterval(emojiIntervalId);
    emojiContainer.innerHTML = '';
  });

  songSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentMood = '';
      body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
      updateMoodBackground('');
      searchSongs();
      clearInterval(emojiIntervalId);
      emojiContainer.innerHTML = '';
    }
  });

  async function searchSongs() {
    const language = languageSelect.value;
    const input = songSearchInput.value.trim();
    let baseQuery = input || 'hits';
    let moodQuery = '';

    if (moodLoopMode && currentMood) {
      moodQuery = moodSearchMap[currentMood] ? moodSearchMap[currentMood][0] : '';
      baseQuery = '';
    } else if (currentMood) {
      moodQuery = moodSearchMap[currentMood] ? moodSearchMap[currentMood][0] : '';
    }

    const queryParts = [];
    if (baseQuery) queryParts.push(baseQuery);
    if (moodQuery) queryParts.push(moodQuery);
    if (language !== 'english') queryParts.push(language);

    const query = queryParts.join(' ');

    searchResultsDiv.textContent = 'Searching songs...';

    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
      const data = await res.json();

      if (data.resultCount === 0) {
        searchResultsDiv.textContent = 'No songs found for your search.';
        songs = [];
        return;
      }

      songs = data.results.map(track => ({
        title: track.trackName,
        artist: track.artistName,
        id: track.trackId,
        img: track.artworkUrl100.replace('100x100', '300x300'),
        src: track.previewUrl,
        videoSrc: sampleSongVideos[track.trackId] || null,
        album: track.collectionName
      }));

      renderSearchResults();
    } catch (e) {
      searchResultsDiv.textContent = 'Error fetching songs.';
    }
  }

  function renderSearchResults() {
    searchResultsDiv.innerHTML = '';
    songs.forEach((song, idx) => {
      const div = document.createElement('div');
      div.className = 'song-item';
      div.innerHTML = `
        <img src="${song.img}" alt="${song.title}" />
        <span>${song.title} - ${song.artist}
          <span class="song-album-info">${song.album ? 'Album: ' + song.album : ''}</span>
        </span>
        <button data-index="${idx}">Play</button>
        <button class="add-to-playlist-btn" data-index="${idx}">＋Playlist</button>
        <a href="${song.src}" class="download-btn" download title="Download preview">⬇️</a>
      `;
      searchResultsDiv.appendChild(div);
    });

    document.querySelectorAll('.song-item button[data-index]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = e.target.getAttribute('data-index');
        currentSongIndex = idx;
        loadSong(songs[idx]);
        playSong();
      });
    });

    document.querySelectorAll('.add-to-playlist-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = e.target.getAttribute('data-index');
        addToPlaylist(songs[idx]);
      });
    });
  }

  sharePlaylistBtn.addEventListener('click', () => {
    const playlistArr = allPlaylists[currentPlaylist];
    if (!playlistArr.length) {
      shareStatus.textContent = 'No songs to share yet!';
      setTimeout(() => { shareStatus.textContent = ''; }, 1800);
      return;
    }
    const playlistText = playlistArr.map(song =>
      `${song.title} by ${song.artist}`
    ).join('\n');
    navigator.clipboard.writeText(playlistText)
      .then(() => {
        shareStatus.textContent = 'Playlist copied! Share with friends!';
      })
      .catch(() => {
        shareStatus.textContent = 'Failed to copy!';
      });
    setTimeout(() => { shareStatus.textContent = ''; }, 2300);
  });

  // Voice Search
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    voiceSearchBtn.addEventListener('click', () => {
      voiceSearchBtn.textContent = '🎙️ Listening...';
      recognition.start();
    });
    recognition.addEventListener('result', e => {
      const speechText = e.results[0][0].transcript;
      songSearchInput.value = speechText;
      recognition.stop();
      voiceSearchBtn.textContent = '🎤';
      currentMood = '';
      body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
      updateMoodBackground('');
      searchSongs();
    });
    recognition.addEventListener('error', err => {
      voiceSearchBtn.textContent = '🎤';
      alert('Voice recognition error, please try again.');
    });
    recognition.addEventListener('end', () => {
      voiceSearchBtn.textContent = '🎤';
    });
  } else {
    voiceSearchBtn.style.display = 'none';
  }

  updateMoodBackground('');
  updatePlaylistDropdown();

  // Emoji animation related functions

  function createEmoji(char) {
    const emoji = document.createElement('div');
    emoji.textContent = char;
    emoji.className = 'emoji';
    emoji.style.position = 'fixed';
    emoji.style.left = (Math.random() * 100) + 'vw';
    emoji.style.bottom = '-50px';
    emoji.style.fontSize = (20 + Math.random() * 20) + 'px';
    emoji.style.opacity = 0.8;
    emoji.style.userSelect = 'none';
    emoji.style.pointerEvents = 'none';
    emoji.style.animation = `floatUp ${5 + Math.random() * 4}s linear forwards`;
    document.body.appendChild(emoji);
    setTimeout(() => {
      emoji.remove();
    }, 9000);
  }

  function startEmojiAnimation(mood) {
    if (emojiIntervalId) {
      clearInterval(emojiIntervalId);
      emojiIntervalId = null;
    }
    if (mood === 'happy') {
      emojiIntervalId = setInterval(() => {
        createEmoji('😊');
        createEmoji('😄');
      }, 700);
    } else if (mood === 'sad') {
      emojiIntervalId = setInterval(() => {
        createEmoji('😢');
      }, 1200);
    }
  }

  // cleanup emoji when mood reset
  function stopEmojis() {
    if (emojiIntervalId) {
      clearInterval(emojiIntervalId);
      emojiIntervalId = null;
    }
    document.querySelectorAll('body > .emoji').forEach(el => el.remove());
  }

  // Modify mood buttons to use emoji animation
  moodButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentMood = button.getAttribute('data-mood');
      body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
      body.classList.add('mood-' + currentMood);
      updateMoodBackground(currentMood);
      searchSongs();
      stopEmojis();
      startEmojiAnimation(currentMood);
    });
  });

  // On mood reset (manual search), stop emojis
  searchBtn.addEventListener('click', () => {
    currentMood = '';
    body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
    updateMoodBackground('');
    searchSongs();
    stopEmojis();
  });

  songSearchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      currentMood = '';
      body.classList.remove('mood-happy', 'mood-sad', 'mood-chill', 'mood-energetic');
      updateMoodBackground('');
      searchSongs();
      stopEmojis();
    }
  });

});
