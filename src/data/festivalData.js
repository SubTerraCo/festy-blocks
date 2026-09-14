export const DAYS = ['friday', 'saturday', 'sunday'];

export const TIME_SLOTS = [
  { id: '1230', label: '12:30 PM - 1:30 PM', start: 12.5, end: 13.5 },
  { id: '1330', label: '1:30 PM - 2:30 PM', start: 13.5, end: 14.5 },
  { id: '1430', label: '2:30 PM - 3:30 PM', start: 14.5, end: 15.5 },
  { id: '1530', label: '3:30 PM - 4:30 PM', start: 15.5, end: 16.5 },
  { id: '1630', label: '4:30 PM - 5:30 PM', start: 16.5, end: 17.5 },
  { id: '1730', label: '5:30 PM - 6:30 PM', start: 17.5, end: 18.5 },
  { id: '1830', label: '6:30 PM - 7:30 PM', start: 18.5, end: 19.5 },
  { id: '1930', label: '7:30 PM - 8:30 PM', start: 19.5, end: 20.5 },
  { id: '2030', label: '8:30 PM - 9:30 PM', start: 20.5, end: 21.5 },
  { id: '2130', label: '9:30 PM - 10:30 PM', start: 21.5, end: 22.5 },
  { id: '2230', label: '10:30 PM - 11:30 PM', start: 22.5, end: 23.5 },
  { id: '2330', label: '11:30 PM - 12:30 AM', start: 23.5, end: 24.5 },
];

export const ARTISTS = {
  friday: [
    { name: 'Johnny Tsunami', stage: 'Ohm Dome', start: 12.0, end: 13.0 },
    { name: 'Kelly Hinds et al.', stage: 'Ohm Dome', start: 13.25, end: 14.25 },
    { name: 'Mikey Thunder', stage: 'Prismatic', start: 13.5, end: 14.5 },
    { name: 'Madhaus', stage: 'Prismatic', start: 14.5, end: 15.75 },
    { name: 'Hyperspace Sky', stage: 'Ohm Dome', start: 14.5, end: 15.75 },
    { name: 'Eliptek', stage: 'Prismatic', start: 16.0, end: 17.0 },
    { name: 'Melina Rodriguez', stage: 'Ohm Dome', start: 16.0, end: 17.0 },
    { name: 'LP Giobbi', stage: 'Main Stage', start: 18.0, end: 19.5 },
    { name: 'Pretty Lights', stage: 'Main Stage', start: 19.75, end: 23.0 },
    { name: 'Midicinal', stage: 'Uplink A', start: 23.25, end: 24.5 },
    { name: 'Face Plant', stage: 'Holographic', start: 23.25, end: 24.75 },
    { name: 'New Earth Resonance', stage: 'Uplink B', start: 23.5, end: 24.5 },
  ],
  saturday: [
    { name: 'Sierra Dawn', stage: 'Prismatic', start: 12.5, end: 13.5 },
    { name: 'Jessy Agha', stage: 'Ohm Dome', start: 12.75, end: 14.0 },
    { name: 'Pheel.', stage: 'Prismatic', start: 13.5, end: 14.5 },
    { name: 'Illuminati Congo', stage: 'Ohm Dome', start: 14.0, end: 15.0 },
    { name: 'Thought Process', stage: 'Prismatic', start: 14.5, end: 15.75 },
    { name: 'Hannah Scarpella', stage: 'Ohm Dome', start: 15.25, end: 16.5 },
    { name: 'Paul Basic', stage: 'Prismatic', start: 15.83, end: 17.0 },
    { name: 'Emancipator', stage: 'Main Stage', start: 18.0, end: 19.25 },
    { name: 'Pretty Lights', stage: 'Main Stage', start: 19.75, end: 23.0 },
    { name: 'Underlux', stage: 'Uplink A', start: 23.25, end: 24.5 },
    { name: 'Weselects', stage: 'Holographic', start: 23.25, end: 24.75 },
    { name: 'Hyperspace Sky', stage: 'Uplink B', start: 23.5, end: 24.5 },
  ],
  sunday: [
    { name: 'Echoe Harmonic Healing', stage: 'Prismatic', start: 11.5, end: 13.0 },
    { name: 'Lisa Parente', stage: 'Ohm Dome', start: 12.25, end: 13.25 },
    { name: 'Saturna', stage: 'Prismatic', start: 13.25, end: 14.41 },
    { name: 'Emily Howard', stage: 'Ohm Dome', start: 13.5, end: 14.5 },
    { name: 'RJD2', stage: 'Prismatic', start: 14.66, end: 16.0 },
    { name: 'Gramatik', stage: 'Main Stage', start: 17.0, end: 18.25 },
    { name: 'Pretty Lights', stage: 'Main Stage', start: 18.75, end: 22.0 },
    { name: 'Sierra Dawn', stage: 'Uplink B', start: 22.25, end: 23.5 },
    { name: 'Homemade Spaceship', stage: 'Uplink A', start: 22.5, end: 24.0 },
    { name: 'Mithridates, Pants...', stage: 'Holographic', start: 22.5, end: 25.5 },
  ]
};

export const getArtistsForSlot = (day, slotStart, slotEnd) => {
  if (!ARTISTS[day]) return [];
  return ARTISTS[day].filter(artist => {
    // Overlap condition: artist starts before slot ends AND artist ends after slot starts
    return artist.start < slotEnd && artist.end > slotStart;
  });
};

export const formatTime = (decimalTime) => {
  const hours24 = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours24) * 60);
  const ampm = hours24 >= 12 && hours24 < 24 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const minsStr = minutes.toString().padStart(2, '0');
  return `${hours12}:${minsStr} ${ampm}`;
};
