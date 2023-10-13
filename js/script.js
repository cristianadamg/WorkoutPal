'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formUI = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const formBtn = document.querySelector('.form_btn');
const validationError = document.querySelector('.validationMessage');
const clearButtonUI = document.querySelector('.clear-workouts-button');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in mi
    this.duration = duration; // in min
  }

  setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  clickCounter() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// APP Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapMarkers = [];
  #mapZoomLevel = 13;

  constructor() {
    this.getPosition();

    // Get Data from local Storage
    this.getLS();

    // Event Handlers
    formUI.addEventListener('submit', this.newWorkout.bind(this));
    formBtn.addEventListener('click', this.newWorkout.bind(this));
    inputType.addEventListener('change', this.toggleElevationField);
    containerWorkouts.addEventListener('click', this.moveToPopup.bind(this));
    clearButtonUI.addEventListener('click', this.clearWorkouts.bind(this));
  }

  getPosition() {
    if (navigator.geolocation) {
      // test if navigator.geolocation exists in the browser, in order to not get any errors in older browsers
      navigator.geolocation.getCurrentPosition(
        this.loadMap.bind(this),
        function () {
          alert(`Couldn't get your position`);
        }
      );
    }
  }

  loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.showForm.bind(this));

    this.#workouts.forEach(work => {
      this.renderWorkoutMarker(work);
    });
  }

  showForm(mapE) {
    this.#mapEvent = mapE;
    formUI.classList.remove('hidden');
    inputDistance.focus();
  }

  hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    formUI.style.display = 'none';
    formUI.classList.add('hidden');
    setTimeout(() => (formUI.style.display = 'grid'), 1000);
  }

  toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        // return alert('Inputs have to be positive numbers!');
        showError();
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        // return alert('Inputs have to be positive numbers!');
        showError();
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this.renderWorkoutMarker(workout);
    // Render workout on list
    this.renderWorkout(workout);

    // Hide form & Clear Input Fields
    this.hideForm();

    // Set local storage to all workouts
    this.setLS();
  }

  renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#mapMarkers.push(marker);
  }

  renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">mi</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/mi</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
    }

    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">mi/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
            `;
    }

    formUI.insertAdjacentHTML('afterend', html);
  }

  moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // workout.clickCounter();
  }

  setLS() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  getLS() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this.renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // Add a click event listener to the clear workouts button
  clearWorkouts() {
    if (confirm('Are you sure you want to clear all workouts?')) {
      // Clear workouts from the UI
      containerWorkouts.innerHTML = '';

      // Clear workouts from local storage
      localStorage.removeItem('workouts');

      // Clear the workouts array in your App instance
      this.#workouts = [];
      // Remove markers from the map
      this.#mapMarkers.forEach(marker => {
        this.#map.removeLayer(marker);
      });
      this.#mapMarkers = []; // Clear the array of markers
    }
  }
}

// Show Error Function
function showError() {
  validationError.classList.remove('hidden');
  setTimeout(() => validationError.classList.add('hidden'), 3500);
  preventDefault();
}

const program = new App();
