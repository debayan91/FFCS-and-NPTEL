import React, { useState, useEffect } from 'react';
import facultyData from './facultyData.js';
import labClasses from './labClasses.js';
import theoryClasses from './theoryClasses.js';

function App() {
  const [showTheoryList, setShowTheoryList] = useState(false);
  const [showLabList, setShowLabList] = useState(false);
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([
    { name: 'dsa', hasLab: true, theorySlots: 'E1+TE1, E2+TE2' },
    { name: 'database', hasLab: true, theorySlots: 'B1+TB1, B2+TB2' },
    { name: 'os', hasLab: true, theorySlots: 'C1+TC1, C2+TC2' },
    { name: 'cloud', hasLab: false, theorySlots: 'G1+TG1, G2+TG2' },
    { name: 'advcp', hasLab: false, theorySlots: 'F1+TF1, F2+TF2' },
    { name: 'compiler', hasLab: true, theorySlots: 'A1+TA1, A2+TA2, E1+TE1, E2+TE2' },
    { name: 'ai', hasLab: false, theorySlots: 'D1+TD1, D2+TD2, G2+TG2' }
  ]);

  const [showAllTeachersView, setShowAllTeachersView] = useState(false);
  const [savedSelectionName, setSavedSelectionName] = useState('');
  const [savedSelections, setSavedSelections] = useState({});
  const [showSavedSelectionsModal, setShowSavedSelectionsModal] = useState(false);
  const [showTimetableHover, setShowTimetableHover] = useState(false);

  // Load saved selections and last loaded selection on mount
  useEffect(() => {
    const storedSelections = localStorage.getItem('courseSelections');
    if (storedSelections) {
      setSavedSelections(JSON.parse(storedSelections));
    }
    const lastLoadedSelection = localStorage.getItem('lastLoadedSelection');
    if (lastLoadedSelection) {
      const parsed = JSON.parse(lastLoadedSelection);
      if (parsed.classes) {
        setSelectedClasses(parsed.classes);
        setSavedSelectionName(parsed.name || '');
        setAvailableSubjects(prev => prev.map(subj => ({
          ...subj,
          selected: parsed.classes.some(cls => cls.subject === subj.name)
        })));
      }
    }
  }, []);

  // Save last loaded selection
  useEffect(() => {
    if (selectedClasses.length > 0) {
      localStorage.setItem('lastLoadedSelection', JSON.stringify({
        classes: selectedClasses,
        name: savedSelectionName
      }));
    } else {
      localStorage.removeItem('lastLoadedSelection');
    }
  }, [selectedClasses, savedSelectionName]);

  // Save all savedSelections to localStorage
  useEffect(() => {
    localStorage.setItem('courseSelections', JSON.stringify(savedSelections));
  }, [savedSelections]);

  // Check for class clashes
  const checkClash = (newClass) => {
    if (!newClass || !newClass.startTime) return false;
    const newStart = new Date(`01/01/2000 ${newClass.startTime}`);
    const newEnd = new Date(`01/01/2000 ${newClass.endTime}`);

    for (const selectedClass of selectedClasses) {
      // Allow editing a subject without it clashing with its own current selection
      if (selectedSubject && selectedClass.subject === selectedSubject.name) {
        continue;
      }

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

  // Handle class selection
  const handleClassSelect = (subjectName, theoryClass, labClass = null) => {
    // Remove old selections for this subject to replace instead of duplicate
    let newSelectedClasses = selectedClasses.filter(item => item.subject !== subjectName);

    const theorySlots = theoryClass.slot.split('+');

    // Add non-T slot classes
    const nonTSlot = theorySlots.find(slot => !slot.startsWith('T'));
    if (nonTSlot) {
      const nonTTheorySlots = theoryClasses.filter(tc => tc.code === nonTSlot);
      nonTTheorySlots.forEach(slotInfo => {
        newSelectedClasses.push({
          subject: subjectName,
          type: 'theory',
          faculty: theoryClass.faculty,
          venue: theoryClass.venue,
          day: slotInfo.day,
          startTime: slotInfo.startTime,
          endTime: slotInfo.endTime,
          slot: theoryClass.slot
        });
      });
    }

    // Add T slot class
    const TSlot = theorySlots.find(slot => slot.startsWith('T'));
    if (TSlot) {
      const TTheorySlot = theoryClasses.find(tc => tc.code === TSlot);
      if (TTheorySlot) {
        newSelectedClasses.push({
          subject: subjectName,
          type: 'theory',
          faculty: theoryClass.faculty,
          venue: TTheorySlot.venue, // Use TTheorySlot's venue
          day: TTheorySlot.day,
          startTime: TTheorySlot.startTime,
          endTime: TTheorySlot.endTime,
          slot: theoryClass.slot
        });
      }
    }

    // Add lab class if provided
    if (labClass) {
      const labSlots = labClass.slot.split('+');
      const firstLab = labClasses.find(lc => lc.code === labSlots[0]);
      const secondLab = labClasses.find(lc => lc.code === labSlots[1]);
      if (firstLab && secondLab) {
        newSelectedClasses.push({
          subject: subjectName,
          type: 'lab',
          faculty: labClass.faculty,
          venue: labClass.venue,
          day: firstLab.day,
          startTime: firstLab.startTime,
          endTime: secondLab.endTime,
          slot: labClass.slot
        });
      }
    }

    setSelectedClasses(newSelectedClasses);
    setAvailableSubjects(prev => prev.map(subj => subj.name === subjectName ? { ...subj, selected: true } : subj));
    setSelectedSubject(null); // Stay on subject selection page, but clear faculty selection for the current subject
    setShowSubjectSelection(true); // Keep the subject selection modal open
  };

  // Get lab slots for faculty
  const getLabSlotsForFaculty = (subject, faculty, theorySlot) => {
    const isMorningTheory = theorySlot.endsWith('1');
    const allLabSlots = facultyData[subject].lab.filter(lab => lab.faculty === faculty);
    return isMorningTheory
      ? allLabSlots.filter(lab => parseInt(lab.slot.split('+')[0].substring(1)) >= 31)
      : allLabSlots.filter(lab => parseInt(lab.slot.split('+')[0].substring(1)) <= 30);
  };

  // Save current selection
  const saveCurrentSelection = () => {
    if (!savedSelectionName.trim()) {
      alert('Please enter a name for your selection.');
      return;
    }
    setSavedSelections(prev => ({
      ...prev,
      [savedSelectionName]: selectedClasses
    }));
    alert(`Selection "${savedSelectionName}" saved!`);
  };

  // Load selection
  const loadSelection = (name) => {
    const loadedClasses = savedSelections[name];
    if (loadedClasses) {
      setSelectedClasses(loadedClasses);
      setSavedSelectionName(name);
      setAvailableSubjects(prev => prev.map(subj => ({
        ...subj,
        selected: loadedClasses.some(cls => cls.subject === subj.name)
      })));
      alert(`Selection "${name}" loaded!`);
      setShowSavedSelectionsModal(false); // Close modal after loading
    } else {
      alert(`Selection "${name}" not found.`);
    }
  };

  // Clear current selection
  const clearCurrentSelection = () => {
    setSelectedClasses([]);
    setSavedSelectionName('');
    setAvailableSubjects(prev => prev.map(subj => ({ ...subj, selected: false })));
    localStorage.removeItem('lastLoadedSelection');
    alert('Current selection cleared!');
  };

  // Delete saved selection
  const deleteSavedSelection = (name) => {
    setSavedSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[name];
      return newSelections;
    });
    if (savedSelectionName === name) {
      clearCurrentSelection();
    }
    alert(`Selection "${name}" deleted.`);
  };

  // Delete all saved selections
  const deleteAllSavedSelections = () => {
    if (window.confirm('Are you sure you want to delete ALL saved selections?')) {
      setSavedSelections({});
      clearCurrentSelection();
      alert('All saved selections have been deleted.');
    }
  };

  // Render all teachers view
  const renderAllTeachersView = () => {
    if (!showAllTeachersView) return null;

    const selectedTeachers = selectedClasses.reduce((acc, classItem) => {
      if (!acc[classItem.subject]) {
        acc[classItem.subject] = {
          subject: classItem.subject,
          faculty: classItem.faculty,
          theorySlot: '',
          labSlot: ''
        };
      }
      if (classItem.type === 'theory') {
        acc[classItem.subject].theorySlot = classItem.slot;
      } else if (classItem.type === 'lab') {
        acc[classItem.subject].labSlot = classItem.slot;
      }
      return acc;
    }, {});

    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border border-gray-300 w-80 max-h-96 overflow-y-auto">
        <h3 className="text-md font-bold mb-2 text-black text-center">Selected Teachers</h3>
        <button
          onClick={() => setShowAllTeachersView(false)}
          className="absolute top-1 right-2 text-gray-500 hover:text-gray-700 text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
        {Object.values(selectedTeachers).length > 0 ? (
          <ul className="text-sm text-black">
            {Object.values(selectedTeachers).map((teacherInfo, index) => (
              <li key={index} className="mb-1">
                <span className="font-semibold">{teacherInfo.subject.toUpperCase()}:</span> {teacherInfo.faculty}
                {teacherInfo.theorySlot && ` (Theory: ${teacherInfo.theorySlot})`}
                {teacherInfo.labSlot && ` (Lab: ${teacherInfo.labSlot})`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 text-center">No teachers selected yet.</p>
        )}
      </div>
    );
  };

  // Render subject selection
  const renderSubjectSelection = () => {
    if (!selectedSubject) return null;

    let theoryOptions = [...facultyData[selectedSubject.name].theory];
    // Sort teachers: morning slots first, then evening, then alphabetically by name.
    theoryOptions.sort((a, b) => {
      const isAMorning = a.slot.endsWith('1');
      const isBMorning = b.slot.endsWith('1');

      if (isAMorning && !isBMorning) return -1;
      if (!isAMorning && isBMorning) return 1;

      return a.faculty.localeCompare(b.faculty);
    });

    const currentSubjectIndex = availableSubjects.findIndex(s => s.name === selectedSubject.name);
    const nextSubject = currentSubjectIndex >= 0 && currentSubjectIndex < availableSubjects.length - 1
      ? availableSubjects[currentSubjectIndex + 1]
      : null;

    const getLabDayForNextSubject = () => {
      if (!nextSubject || !nextSubject.hasLab) return null;
      const nextLabClass = selectedClasses.find(cls => cls.subject === nextSubject.name && cls.type === 'lab');
      return nextLabClass ? nextLabClass.day : null;
    };
    const nextLabDay = getLabDayForNextSubject();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full h-full max-h-screen overflow-y-auto relative">
          <button onClick={() => { setSelectedSubject(null); setShowSubjectSelection(true); }} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl leading-none" aria-label="Close Faculty Selection">&times;</button>
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
                  const theorySlots = theoryClass.slot.split('+');
                  let theoryClash = false;
                  let theorySlotInfoText = [];

                  const nonTSlotCode = theorySlots.find(s => !s.startsWith('T'));
                  if (nonTSlotCode) {
                    const slots = theoryClasses.filter(tc => tc.code === nonTSlotCode);
                    slots.forEach(s => {
                      if (checkClash({ ...s, subject: selectedSubject.name })) theoryClash = true;
                    });
                    if (slots.length > 0) theorySlotInfoText.push(`${slots[0].code} (${slots.map(s => s.day.substring(0, 3)).join('/')})`);
                  }

                  const tSlotCode = theorySlots.find(s => s.startsWith('T'));
                  if (tSlotCode) {
                    const slot = theoryClasses.find(tc => tc.code === tSlotCode);
                    if (slot) {
                      if (checkClash({ ...slot, subject: selectedSubject.name })) theoryClash = true;
                      theorySlotInfoText.push(`${slot.code} (${slot.day.substring(0, 3)})`);
                    }
                  }

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
                      if (labStartSlot && labEndSlot) {
                        labSlotInfo = { day: labStartSlot.day, startTime: labStartSlot.startTime, endTime: labEndSlot.endTime, slot: potentialLab.slot, venue: potentialLab.venue, subject: selectedSubject.name };
                        if (checkClash(labSlotInfo)) {
                          labClash = true;
                        }
                      } else {
                        labClash = true;
                      }
                    } else {
                      labClash = true;
                    }
                  }

                  const totalClash = theoryClash || labClash;
                  const isMorningSlot = theoryClass.slot.endsWith('1');
                  const rowClass = totalClash
                    ? 'bg-red-50 border border-red-500'
                    : isMorningSlot
                      ? 'bg-blue-100 border border-sky-500'
                      : 'bg-yellow-100 border border-yellow-500';

                  const showExclamation = (() => {
                    if (!nextSubject || !nextSubject.hasLab || !labSlotInfo || !nextLabDay) return false;

                    // Filter out the current subject's lab from selectedClasses for accurate clash check
                    const otherSelectedClasses = selectedClasses.filter(cls => cls.subject !== selectedSubject.name);

                    if (labSlotInfo.day === nextLabDay) {
                      const nextLabClasses = otherSelectedClasses.filter(cls => cls.subject === nextSubject.name && cls.type === 'lab');
                      if (nextLabClasses.length === 0) return false;
                      const nextLabClassTime = nextLabClasses[0];
                      const currentStart = new Date(`01/01/2000 ${labSlotInfo.startTime}`);
                      const currentEnd = new Date(`01/01/2000 ${labSlotInfo.endTime}`);
                      const nextStart = new Date(`01/01/2000 ${nextLabClassTime.startTime}`);
                      const nextEnd = new Date(`01/01/2000 ${nextLabClassTime.endTime}`);

                      // Check for non-clashing overlap on the same day
                      if ((currentEnd <= nextStart || currentStart >= nextEnd) && labSlotInfo.day === nextLabClassTime.day) {
                        return true;
                      }
                    }
                    return false;
                  })();

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 relative">
                        {theoryClass.faculty}
                        {showExclamation && (
                          <span className="absolute top-1 right-1 text-red-600 font-bold text-lg select-none" title="Next subject's lab on same day (non-clashing)">!</span>
                        )}
                      </td>
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
            <button onClick={() => { setSelectedSubject(null); setShowSubjectSelection(true); }} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Subjects</button>
          </div>
        </div>
      </div>
    );
  };

  const renderTimetableGrid = () => {
    const findClassesForCell = (slotCode, day) => {
      const matchingClasses = [];
      let cellTimeInfo;
      if (slotCode.startsWith('L')) {
        cellTimeInfo = labClasses.find(lc => lc.code === slotCode && lc.day === day);
      } else {
        cellTimeInfo = theoryClasses.find(tc => tc.code === slotCode && tc.day === day);
      }

      if (!cellTimeInfo) return [];

      const cellStart = new Date(`01/01/2000 ${cellTimeInfo.startTime}`);

      for (const selectedClass of selectedClasses) {
        if (selectedClass.day === day) {
          const selectedStart = new Date(`01/01/2000 ${selectedClass.startTime}`);
          const selectedEnd = new Date(`01/01/2000 ${selectedClass.endTime}`);
          if (cellStart >= selectedStart && cellStart < selectedEnd) {
            matchingClasses.push(selectedClass);
          }
        }
      }
      return matchingClasses;
    };

    return (
      <div className="w-auto max-w-4xl overflow-x-auto bg-white rounded-lg shadow-lg">
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
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <tr key={day.toLowerCase()} id={day.toLowerCase().slice(0, 3)} className="hover:bg-gray-100 transition-colors">
                <td className="border border-black p-1 text-black font-semibold text-xs text-center">{day.substring(0, 3).toUpperCase()}</td>
                {[
                  'A1', 'F1', 'D1', 'TB1', 'TG1', 'L6',
                  'A2', 'F2', 'D2', 'TB2', 'TG2', 'L36',
                  'V3'
                ].map(slotCode => {
                  const classesInCell = findClassesForCell(slotCode, day);
                  const classItem = classesInCell.length > 0 ? classesInCell[0] : null;
                  const hasClash = classesInCell.length > 1;

                  return (
                    <td key={slotCode} className={`border border-black p-1 text-black text-xs text-center align-middle ${hasClash ? 'bg-red-300' : classItem ? 'bg-green-200' : ''}`}>
                      {classItem ? (
                        <div className="text-[10px] leading-tight">
                          <div className="font-bold">{classItem.subject.toUpperCase()}</div>
                          <div className="truncate">{classItem.faculty}</div>
                          {hasClash && <div className="font-bold text-red-700">CLASH!</div>}
                        </div>
                      ) : (
                        slotCode
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTimetableHover = () => {
    if (!showTimetableHover) return null;

    return (
      <div className="absolute top-12 left-0 border border-gray-400 rounded-lg shadow-2xl z-50 pointer-events-none bg-white p-2">
        {renderTimetableGrid()}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-screen bg-white text-black flex flex-col justify-center items-center p-4">
      {/* Floating "View Timetable" UI Component */}
      <div
        className="fixed top-4 left-4 z-[60]"
        onMouseEnter={() => setShowTimetableHover(true)}
        onMouseLeave={() => setShowTimetableHover(false)}
      >
        <button className="p-2 bg-gray-700 text-white rounded-full shadow-lg">
          👁️
        </button>
        {renderTimetableHover()}
      </div>

      {/* Selected Classes Table */}
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
          onClick={() => setShowSubjectSelection(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Select/Edit Subjects
        </button>
        <button
          onClick={() => setShowAllTeachersView(!showAllTeachersView)}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
        >
          {showAllTeachersView ? 'Hide Teachers' : 'View All Teachers'}
        </button>
        <button
          onClick={() => setShowSavedSelectionsModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          View Saved Selections
        </button>
      </div>

      {/* Save/Load Selection Section (Integrated into View Saved Selections Modal) */}
      {showSavedSelectionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowSavedSelectionsModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl leading-none"
              aria-label="Close Saved Selections"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold text-black mb-4 text-center">Manage Selections</h3>
            <div className="flex flex-col md:flex-row gap-3 items-center justify-center mb-4">
              <input
                type="text"
                placeholder="Enter name for selection"
                value={savedSelectionName}
                onChange={(e) => setSavedSelectionName(e.target.value)}
                className="p-2 border border-gray-300 rounded w-full md:w-64 text-black"
              />
              <button
                onClick={saveCurrentSelection}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors w-full md:w-auto"
              >
                Save Current Selection
              </button>
              <button
                onClick={clearCurrentSelection}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors w-full md:w-auto"
              >
                Clear Current Selection
              </button>
            </div>
            <h4 className="text-lg font-semibold text-black mb-3 text-center">Saved Timetable Configurations:</h4>
            {Object.keys(savedSelections).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.keys(savedSelections).map(name => (
                  <div key={name} className="flex flex-col p-3 border border-gray-300 rounded bg-white shadow-sm">
                    <span className="text-md font-semibold text-black mb-2">{name}</span>
                    <ul className="text-sm text-gray-700 max-h-24 overflow-y-auto mb-2">
                      {savedSelections[name].length > 0 ? (
                        savedSelections[name].map((item, idx) => (
                          <li key={idx} className="truncate">{item.subject.toUpperCase()}: {item.faculty}</li>
                        ))
                      ) : (
                        <li>(Empty selection)</li>
                      )}
                    </ul>
                    <div className="flex justify-end gap-2 mt-auto">
                      <button
                        onClick={() => loadSelection(name)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSavedSelection(name)}
                        className="px-3 py-1 bg-red-400 text-white rounded text-xs hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600">No saved selections found.</p>
            )}
            <div className="mt-6 text-center">
              <button
                onClick={deleteAllSavedSelections}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
              >
                Delete All Saved Selections
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Selection Modal */}
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
                  className={`border rounded p-4 cursor-pointer ${subject.selected ? 'bg-green-100 border-green-500' : 'hover:bg-gray-50'}`}
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
                  <div className="mt-2 flex justify-center space-x-2">
                    <button
                      onClick={() => setSelectedSubject(subject)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      {subject.selected ? 'Reassign Teacher' : 'Assign Teacher'}
                    </button>
                    {subject.selected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening subject selection on edit click
                          setSelectedClasses(prev => prev.filter(cls => cls.subject !== subject.name));
                          setAvailableSubjects(prev => prev.map(subj => subj.name === subject.name ? { ...subj, selected: false } : subj));
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSubjectSelection(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Selection Modal */}
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
        {renderTimetableGrid()}
      </div>

      {/* Render all teachers window */}
      {renderAllTeachersView()}
    </div>
  );
}

export default App;
