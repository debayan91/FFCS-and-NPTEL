import React, { useState, useEffect } from 'react';
import facultyData from './facultyData.js';
import labClasses from './labClasses.js';
import theoryClasses from './theoryClasses.js'; // Added .js for consistency

function App() {
  const [showTheoryList, setShowTheoryList] = useState(false);
  const [showLabList, setShowLabList] = useState(false);
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([
        { name: 'beee', hasLab: false, theorySlots: 'C1+TC1, F1+TF1, F2+TF2, G1+TG1, G2+TG2' },
        { name: 'software', hasLab: true, theorySlots: 'A1+TA1, A2+TA2' },
        { name: 'crypto', hasLab: true, theorySlots: 'B1+TB1, B2+TB2' },
        { name: 'advcp', hasLab: false, theorySlots: 'E1+TE1, E2+TE2, F1+TF1, F2+TF2' },
        { name: 'embedded', hasLab: false, theorySlots: 'G1+TG1, G2+TG2' },
        { name: 'ml', hasLab: true, theorySlots: 'C1+TC1, C2+TC2' },
        { name: 'deeplearning', hasLab: true, theorySlots: 'A1+TA1, A2+TA2' },
        { name: 'dip', hasLab: false, theorySlots: 'F1+TF1, F2+TF2' },
        { name: 'nlp', hasLab: false, theorySlots: 'C1+TC1, C2+TC2' },
        { name: 'cloudcomputing', hasLab: false, theorySlots: 'D1+TD1, D2+TD2' },
        { name: 'machinevision', hasLab: true, theorySlots: 'D1+TD1' }
    ]);

  // Function to check if a new class would clash with selected classes
  const checkClash = (newClass) => {
    if (!newClass || !newClass.startTime) return false; // Guard against null/undefined classes
    const newStart = new Date(`01/01/2000 ${newClass.startTime}`);
    const newEnd = new Date(`01/01/2000 ${newClass.endTime}`);
    
    for (const selectedClass of selectedClasses) {
      const selectedStart = new Date(`01/01/2000 ${selectedClass.startTime}`);
      const selectedEnd = new Date(`01/01/2000 ${selectedClass.endTime}`);
      
      if (newClass.day === selectedClass.day) {
        if ((newStart >= selectedStart && newStart < selectedEnd) || 
            (newEnd > selectedStart && newEnd <= selectedEnd) ||
            (newStart <= selectedStart && newEnd >= selectedEnd)) {
          return true;
        }
      }
    }
    return false;
  };

  // CORRECTED: Function to check if a cell in timetable is occupied
  const isCellOccupied = (slotCode, day) => {
    let classTime = null;
    if (slotCode.startsWith('L')) {
      classTime = labClasses.find(lc => lc.code === slotCode && lc.day === day);
    } else {
      classTime = theoryClasses.find(tc => tc.code === slotCode && tc.day === day);
    }
    if (!classTime) return false;
    return checkClash({
      day: classTime.day,
      startTime: classTime.startTime,
      endTime: classTime.endTime,
    });
  };

  // CORRECTED: Function to handle class selection
  const handleClassSelect = (subject, theoryClass, labClass = null) => {
    const newSelectedClasses = [...selectedClasses];
    const theorySlots = theoryClass.slot.split('+');
    
    // Handle the non-T slot (occurs twice)
    const nonTSlot = theorySlots.find(slot => !slot.startsWith('T'));
    if (nonTSlot) {
      const nonTTheorySlots = theoryClasses.filter(tc => tc.code === nonTSlot);
      nonTTheorySlots.forEach(slotInfo => {
        newSelectedClasses.push({ subject, type: 'theory', faculty: theoryClass.faculty, venue: theoryClass.venue, day: slotInfo.day, startTime: slotInfo.startTime, endTime: slotInfo.endTime, slot: theoryClass.slot });
      });
    }
    
    // Handle the T slot (occurs once)
    const TSlot = theorySlots.find(slot => slot.startsWith('T'));
    if (TSlot) {
      const TTheorySlot = theoryClasses.find(tc => tc.code === TSlot);
      if (TTheorySlot) {
        newSelectedClasses.push({ subject, type: 'theory', faculty: theoryClass.faculty, venue: TTheorySlot.venue, day: TTheorySlot.day, startTime: TTheorySlot.startTime, endTime: TTheorySlot.endTime, slot: theoryClass.slot });
      }
    }
    
    // Add lab class if exists
    if (labClass) {
      const labSlots = labClass.slot.split('+');
      const firstLab = labClasses.find(lc => lc.code === labSlots[0]);
      const secondLab = labClasses.find(lc => lc.code === labSlots[1]);
      if (firstLab && secondLab) {
        newSelectedClasses.push({ subject, type: 'lab', faculty: labClass.faculty, venue: labClass.venue, day: firstLab.day, startTime: firstLab.startTime, endTime: secondLab.endTime, slot: labClass.slot });
      }
    }
    
    setSelectedClasses(newSelectedClasses);
    setSelectedSubject(null);
    setShowSubjectSelection(false);
    setAvailableSubjects(prev => prev.map(subj => subj.name === subject ? { ...subj, selected: true } : subj));
  };

  // Function to get lab slots for a faculty based on theory slot
  const getLabSlotsForFaculty = (subject, faculty, theorySlot) => {
    const isMorningTheory = theorySlot.endsWith('1');
    const allLabSlots = facultyData[subject].lab.filter(lab => lab.faculty === faculty);
    return isMorningTheory
      ? allLabSlots.filter(lab => parseInt(lab.slot.split('+')[0].substring(1)) >= 31)
      : allLabSlots.filter(lab => parseInt(lab.slot.split('+')[0].substring(1)) <= 30);
  };

  // REFACTORED: Function to render subject selection page with new UI and logic
  const renderSubjectSelection = () => {
    if (!selectedSubject) return null;
    
    let theoryOptions = [...facultyData[selectedSubject.name].theory];

    // Sort theory options: morning slots first, then evening, with alphabetical sort within each group
    theoryOptions.sort((a, b) => {
        const isAMorning = a.slot.endsWith('1');
        const isBMorning = b.slot.endsWith('1');
        
        if (isAMorning && !isBMorning) return -1; // a (morning) comes before b (evening)
        if (!isAMorning && isBMorning) return 1;  // b (morning) comes before a (evening)
        
        // If both are morning or both are evening, sort by faculty name
        return a.faculty.localeCompare(b.faculty);
    });
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full h-full max-h-screen overflow-y-auto relative">
          <button onClick={() => { setSelectedSubject(null); setShowSubjectSelection(false); }} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl leading-none" aria-label="Close Faculty Selection">&times;</button>
          <h2 className="text-xl font-bold mb-4 text-center">Select Faculty for {selectedSubject.name.toUpperCase()}</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theory Details</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab Details</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {theoryOptions.map((theoryClass, index) => {
                  // --- Theory Clash Detection ---
                  const theorySlots = theoryClass.slot.split('+');
                  let theoryClash = false;
                  let theorySlotInfoText = [];
                  
                  const nonTSlotCode = theorySlots.find(s => !s.startsWith('T'));
                  if (nonTSlotCode) {
                    const slots = theoryClasses.filter(tc => tc.code === nonTSlotCode);
                    slots.forEach(s => {
                      if (checkClash(s)) theoryClash = true;
                    });
                    if(slots.length > 0) theorySlotInfoText.push(`${slots[0].code} (${slots.map(s => s.day.substring(0,3)).join('/')})`);
                  }
                  
                  const tSlotCode = theorySlots.find(s => s.startsWith('T'));
                  if (tSlotCode) {
                    const slot = theoryClasses.find(tc => tc.code === tSlotCode);
                    if (slot) {
                      if (checkClash(slot)) theoryClash = true;
                      theorySlotInfoText.push(`${slot.code} (${slot.day.substring(0,3)})`);
                    }
                  }

                  // --- Lab Clash Detection & Info Gathering ---
                  let labClash = false;
                  let labSlotInfo = null;
                  let potentialLab = null;

                  if (selectedSubject.hasLab) {
                    const compatibleLabs = getLabSlotsForFaculty(selectedSubject.name, theoryClass.faculty, theoryClass.slot);
                    potentialLab = compatibleLabs.length > 0 ? compatibleLabs[0] : null;

                    if (potentialLab) {
                      const labSlotsSplit = potentialLab.slot.split('+');
                      const labStartSlot = labClasses.find(lc => lc.code === labSlotsSplit[0]);
                      const labEndSlot = labClasses.find(lc => lc.code === labSlotsSplit[1]);
                      if(labStartSlot && labEndSlot) {
                        labSlotInfo = { day: labStartSlot.day, startTime: labStartSlot.startTime, endTime: labEndSlot.endTime, slot: potentialLab.slot, venue: potentialLab.venue };
                        if (checkClash(labSlotInfo)) {
                            labClash = true;
                        }
                      } else {
                        // Data integrity issue, treat as clash
                        labClash = true; 
                      }
                    } else {
                      // No compatible lab slot found for this faculty
                      labClash = true;
                    }
                  }

                  const totalClash = theoryClash || labClash;
                  const isMorningSlot = theoryClass.slot.endsWith('1');
                  const rowClass = totalClash
                    ? 'bg-red-50 border border-red-500' // Clash overrides other colors
                    : isMorningSlot
                      ? 'bg-blue-100 border border-sky-500' // Morning slot
                      : 'bg-yellow-100 border border-yellow-500'; // Evening slot

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{theoryClass.faculty}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <p>Slot: {theorySlotInfoText.join(' + ')}</p>
                        <p>Venue: {theoryClass.venue}</p>
                        {theoryClash && <p className="text-red-600 font-semibold">Theory slot clashes</p>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {!selectedSubject.hasLab ? (
                          <p>N/A</p>
                        ) : labSlotInfo ? (
                          <>
                            <p>Slot: {labSlotInfo.slot}</p>
                            <p>Venue: {labSlotInfo.venue}</p>
                            <p>Time: {labSlotInfo.day} {labSlotInfo.startTime}-{labSlotInfo.endTime}</p>
                            {labClash && <p className="text-red-600 font-semibold">Lab slot clashes</p>}
                          </>
                        ) : (
                           <p className="text-red-600 font-semibold">No compatible lab slot</p>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleClassSelect(selectedSubject.name, theoryClass, potentialLab)}
                          disabled={totalClash}
                          className={`px-3 py-1 rounded text-white ${totalClash ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}>
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => { setSelectedSubject(null); setShowSubjectSelection(false); }} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back</button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen w-screen bg-white text-black flex flex-col justify-center items-center p-4">
      {/* ... The rest of your JSX (Timetable, Selected Classes, Buttons) remains the same ... */}
       {/* Selected Classes Table - Always Visible */}
      {selectedClasses.length > 0 && (
        <div className="mb-6 w-full max-w-4xl">
          <h3 className="text-lg font-bold text-black mb-3 text-center">Your Selected Classes</h3>
          <div className="bg-gray-50 border text-black border-black rounded p-4 max-h-64 overflow-y-auto">
            <table className="w-full border-collapse text-black border border-black text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2">Subject</th>
                  <th className="border border-black p-2">Type</th>
                  <th className="border border-black p-2">Faculty</th>
                  <th className="border border-black p-2">Venue</th>
                  <th className="border border-black p-2">Day</th>
                  <th className="border border-black p-2">Time</th>
                  <th className="border border-black p-2">Slot</th>
                </tr>
              </thead>
              <tbody>
                {selectedClasses.map((classItem, index) => (
                  <tr key={index} className="hover:bg-gray-100 text-black">
                    <td className="border border-black p-2 text-center">{classItem.subject.toUpperCase()}</td>
                    <td className="border border-black p-2 text-center">{classItem.type.toUpperCase()}</td>
                    <td className="border border-black p-2 text-center">{classItem.faculty}</td>
                    <td className="border border-black p-2 text-center">{classItem.venue}</td>
                    <td className="border border-black p-2 text-center">{classItem.day}</td>
                    <td className="border border-black p-2 text-center">{classItem.startTime}-{classItem.endTime}</td>
                    <td className="border border-black p-2 text-center">{classItem.slot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="mb-4 space-x-4">
        <button
          onClick={() => {
            setShowTheoryList(!showTheoryList);
            setShowLabList(false);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {showTheoryList ? 'Hide Theory List' : 'Show All Theory Classes'}
        </button>
        <button
          onClick={() => {
            setShowLabList(!showLabList);
            setShowTheoryList(false);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          {showLabList ? 'Hide Lab List' : 'Show All Lab Classes'}
        </button>
        <button
          onClick={() => setShowSubjectSelection(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Select Subjects
        </button>
      </div>

      {showSubjectSelection && !selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full h-full max-h-screen overflow-y-auto relative">
            <button
              onClick={() => setShowSubjectSelection(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl leading-none"
              aria-label="Close Subject Selection"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Select a Subject</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableSubjects.map((subject, index) => (
                <div 
                  key={index} 
                  className={`border rounded p-4 cursor-pointer ${subject.selected ? 'bg-red-100' : 'hover:bg-gray-50'}`}
                  onClick={() => !subject.selected && setSelectedSubject(subject)}
                >
                  <div className="font-semibold text-center">
                    {subject.name.toUpperCase()}
                  </div>
                  <div className="text-xs text-center mt-1">
                    {subject.theorySlots}
                  </div>
                  <div className="text-sm text-center mt-1">
                    {subject.hasLab ? 'With Lab Component' : 'Theory Only'}
                  </div>
                  {subject.selected && (
                    <div className="text-xs text-red-500 text-center mt-1">
                      Already selected
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSubjectSelection(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSubject && renderSubjectSelection()}

      {/* Theory List */}
      {showTheoryList && (
        <div className="mb-6 w-full max-w-4xl">
          <h3 className="text-lg font-bold text-black mb-3 text-center">All Theory Classes</h3>
          <div className="bg-gray-50 border text-black border-black rounded p-4 max-h-64 overflow-y-auto">
            <table className="w-full border-collapse text-black border border-black text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2">Code</th>
                  <th className="border border-black p-2">Day</th>
                  <th className="border border-black p-2">Start Time</th>
                  <th className="border border-black p-2">End Time</th>
                </tr>
              </thead>
              <tbody>
                {theoryClasses.map((theoryClass, index) => (
                  <tr key={index} className="hover:bg-gray-100 text-black">
                    <td className="border border-black p-2 text-center font-semibold">{theoryClass.code}</td>
                    <td className="border border-black p-2 text-center">{theoryClass.day}</td>
                    <td className="border border-black p-2 text-center">{theoryClass.startTime}</td>
                    <td className="border border-black p-2 text-center">{theoryClass.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lab List */}
      {showLabList && (
        <div className="mb-6 w-full text-black max-w-4xl">
          <h3 className="text-lg font-bold text-black mb-3 text-center">All Lab Classes</h3>
          <div className="bg-gray-50 border border-black rounded p-4 max-h-64 overflow-y-auto">
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2">Code</th>
                  <th className="border border-black p-2">Day</th>
                  <th className="border border-black p-2">Start Time</th>
                  <th className="border border-black p-2">End Time</th>
                </tr>
              </thead>
              <tbody>
                {labClasses.map((labClass, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="border border-black p-2 text-center font-semibold">{labClass.code}</td>
                    <td className="border border-black p-2 text-center">{labClass.day}</td>
                    <td className="border border-black p-2 text-center">{labClass.startTime}</td>
                    <td className="border border-black p-2 text-center">{labClass.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Timetable */}
      <div className="w-auto max-w-4xl overflow-x-auto">
        <h2 className="text-xl font-extrabold text-black mb-4 text-center tracking-wide">Semester Timetable</h2>
        <table className="w-full border-collapse border border-black shadow-md">
          <tbody>
            <tr id="theory" className="bg-gray-100">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">THEORY<br />HOURS</td>
              <td className="border border-black p-1 text-black text-xs text-center">8:00 AM<br />to<br />8:50 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">9:00 AM<br />to<br />9:50 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">10:00 AM<br />to<br />10:50 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">11:00 AM<br />to<br />11:50 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">12:00 PM<br />to<br />12:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center"></td>
              <td className="border border-black p-1 text-black text-center w-2 bg-yellow-200" rowSpan="9" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 'bold', fontSize: '0.9rem', color: '#b45309' }}>
                LUNCH
              </td>
              <td className="border border-black p-1 text-black text-xs text-center">2:00 PM<br />to<br />2:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">3:00 PM<br />to<br />3:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">4:00 PM<br />to<br />4:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">5:00 PM<br />to<br />5:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">6:00 PM<br />to<br />6:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">6:51 PM<br />to<br />7:00 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">7:01 PM<br />to<br />7:50 PM</td>
            </tr>
            <tr id="lab" className="bg-gray-50">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">LAB<br />HOURS</td>
              <td className="border border-black p-1 text-black text-xs text-center">08:00 AM<br />to<br />08:50 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">08:51 AM<br />to<br />09:40 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">09:51 AM<br />to<br />10:40 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">10:41 AM<br />to<br />11:30 AM</td>
              <td className="border border-black p-1 text-black text-xs text-center">11:40 AM<br />to<br />12:30 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">12:31 PM<br />to<br />1:20 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">2:00 PM<br />to<br />2:50 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">2:51 PM<br />to<br />3:40 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">3:51 PM<br />to<br />4:40 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">4:41 PM<br />to<br />5:30 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">5:40 PM<br />to<br />6:30 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center">6:31 PM<br />to<br />7:20 PM</td>
              <td className="border border-black p-1 text-black text-xs text-center"></td>
            </tr>
            <tr id="mon" className="hover:bg-gray-100 transition-colors">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">MON</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('A1', 'Monday') ? 'bg-red-200' : ''}`}>A1 / L1</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('F1', 'Monday') ? 'bg-red-200' : ''}`}>F1 / L2</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('D1', 'Monday') ? 'bg-red-200' : ''}`}>D1 / L3</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TB1', 'Monday') ? 'bg-red-200' : ''}`}>TB1 / L4</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TG1', 'Monday') ? 'bg-red-200' : ''}`}>TG1 / L5</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L6', 'Monday') ? 'bg-red-200' : ''}`}>L6</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('A2', 'Monday') ? 'bg-red-200' : ''}`}>A2 / L31</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('F2', 'Monday') ? 'bg-red-200' : ''}`}>F2 / L32</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('D2', 'Monday') ? 'bg-red-200' : ''}`}>D2 / L33</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TB2', 'Monday') ? 'bg-red-200' : ''}`}>TB2 / L34</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TG2', 'Monday') ? 'bg-red-200' : ''}`}>TG2 / L35</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L36', 'Monday') ? 'bg-red-200' : ''}`}>L36</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V3', 'Monday') ? 'bg-red-200' : ''}`}>V3</td>
            </tr>
            <tr id="tue" className="hover:bg-gray-100 transition-colors">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">TUE</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('B1', 'Tuesday') ? 'bg-red-200' : ''}`}>B1 / L7</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('G1', 'Tuesday') ? 'bg-red-200' : ''}`}>G1 / L8</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('E1', 'Tuesday') ? 'bg-red-200' : ''}`}>E1 / L9</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TC1', 'Tuesday') ? 'bg-red-200' : ''}`}>TC1 / L10</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TAA1', 'Tuesday') ? 'bg-red-200' : ''}`}>TAA1 / L11</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L12', 'Tuesday') ? 'bg-red-200' : ''}`}>L12</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('B2', 'Tuesday') ? 'bg-red-200' : ''}`}>B2 / L37</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('G2', 'Tuesday') ? 'bg-red-200' : ''}`}>G2 / L38</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('E2', 'Tuesday') ? 'bg-red-200' : ''}`}>E2 / L39</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TC2', 'Tuesday') ? 'bg-red-200' : ''}`}>TC2 / L40</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TAA2', 'Tuesday') ? 'bg-red-200' : ''}`}>TAA2 / L41</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L42', 'Tuesday') ? 'bg-red-200' : ''}`}>L42</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V4', 'Tuesday') ? 'bg-red-200' : ''}`}>V4</td>
            </tr>
            <tr id="wed" className="hover:bg-gray-100 transition-colors">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">WED</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('C1', 'Wednesday') ? 'bg-red-200' : ''}`}>C1 / L13</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('A1', 'Wednesday') ? 'bg-red-200' : ''}`}>A1 / L14</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('F1', 'Wednesday') ? 'bg-red-200' : ''}`}>F1 / L15</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V1', 'Wednesday') ? 'bg-red-200' : ''}`}>V1 / L16</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V2', 'Wednesday') ? 'bg-red-200' : ''}`}>V2 / L17</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L18', 'Wednesday') ? 'bg-red-200' : ''}`}>L18</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('C2', 'Wednesday') ? 'bg-red-200' : ''}`}>C2 / L43</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('A2', 'Wednesday') ? 'bg-red-200' : ''}`}>A2 / L44</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('F2', 'Wednesday') ? 'bg-red-200' : ''}`}>F2 / L45</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TD2', 'Wednesday') ? 'bg-red-200' : ''}`}>TD2 / L46</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TBB2', 'Wednesday') ? 'bg-red-200' : ''}`}>TBB2 / L47</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L48', 'Wednesday') ? 'bg-red-200' : ''}`}>L48</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V5', 'Wednesday') ? 'bg-red-200' : ''}`}>V5</td>
            </tr>
            <tr id="thu" className="hover:bg-gray-100 transition-colors">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">THU</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('D1', 'Thursday') ? 'bg-red-200' : ''}`}>D1 / L19</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('B1', 'Thursday') ? 'bg-red-200' : ''}`}>B1 / L20</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('G1', 'Thursday') ? 'bg-red-200' : ''}`}>G1 / L21</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TE1', 'Thursday') ? 'bg-red-200' : ''}`}>TE1 / L22</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TCC1', 'Thursday') ? 'bg-red-200' : ''}`}>TCC1 / L23</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L24', 'Thursday') ? 'bg-red-200' : ''}`}>L24</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('D2', 'Thursday') ? 'bg-red-200' : ''}`}>D2 / L49</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('B2', 'Thursday') ? 'bg-red-200' : ''}`}>B2 / L50</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('G2', 'Thursday') ? 'bg-red-200' : ''}`}>G2 / L51</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TE2', 'Thursday') ? 'bg-red-200' : ''}`}>TE2 / L52</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TCC2', 'Thursday') ? 'bg-red-200' : ''}`}>TCC2 / L53</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L54', 'Thursday') ? 'bg-red-200' : ''}`}>L54</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V6', 'Thursday') ? 'bg-red-200' : ''}`}>V6</td>
            </tr>
            <tr id="fri" className="hover:bg-gray-100 transition-colors">
              <td className="border border-black p-1 text-black font-semibold text-xs text-center">FRI</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('E1', 'Friday') ? 'bg-red-200' : ''}`}>E1 / L25</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('C1', 'Friday') ? 'bg-red-200' : ''}`}>C1 / L26</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TA1', 'Friday') ? 'bg-red-200' : ''}`}>TA1 / L27</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TF1', 'Friday') ? 'bg-red-200' : ''}`}>TF1 / L28</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TD1', 'Friday') ? 'bg-red-200' : ''}`}>TD1 / L29</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L30', 'Friday') ? 'bg-red-200' : ''}`}>L30</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('E2', 'Friday') ? 'bg-red-200' : ''}`}>E2 / L55</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('C2', 'Friday') ? 'bg-red-200' : ''}`}>C2 / L56</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TA2', 'Friday') ? 'bg-red-200' : ''}`}>TA2 / L57</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TF2', 'Friday') ? 'bg-red-200' : ''}`}>TF2 / L58</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('TDD2', 'Friday') ? 'bg-red-200' : ''}`}>TDD2 / L59</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('L60', 'Friday') ? 'bg-red-200' : ''}`}>L60</td>
              <td className={`border border-black p-1 text-black text-xs text-center ${isCellOccupied('V7', 'Friday') ? 'bg-red-200' : ''}`}>V7</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
