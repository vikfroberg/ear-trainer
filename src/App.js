// TODO: Record everything to local storage so that I can show progress later on
// TODO: Find lowest, highest, middle note from chord
import "./App.css";
import React, { useCallback, useState, useEffect, useMemo } from "react";
import Soundfont from "soundfont-player";
import { Piano, MidiNumbers } from "react-piano";
import "react-piano/dist/styles.css";

let noteRange = {
  first: MidiNumbers.fromNote("c2"),
  last: MidiNumbers.fromNote("f5"),
};

function useWindowWidth() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    // Add event listener
    window.addEventListener("resize", handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  return windowSize;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function useGame({ isLoading, playNote, stopNote }) {
  let [noteToFind, setNoteToFind] = useState(
    randomInteger(noteRange.first, noteRange.last)
  );
  let [lastGuess, setLastGuess] = useState(null);
  let [didPlayNoteToFind, setDidPlayNoteToFind] = useState(false);
  let [isPlaying, setIsPlaying] = useState(true);
  useEffect(() => {
    if (!isLoading && !didPlayNoteToFind) {
      setDidPlayNoteToFind(true);
      playNote(noteToFind);
      setTimeout(() => {
        stopNote(noteToFind);
        setIsPlaying(false);
      }, 5000);
    }
  }, [isLoading, didPlayNoteToFind]);

  return {
    didPlayNoteToFind,
    noteToFind,
    lastGuess,
    isPlaying,
    guessNote: (note) => setLastGuess(note),
    again: () => {
      setDidPlayNoteToFind(false);
      setIsPlaying(true);
    },
    next: () => {
      if (lastGuess === noteToFind) {
        alert("SWEEET! You did it!!!");
      } else {
        alert(
          `Maybe some more practice. You were ${Math.abs(
            lastGuess - noteToFind
          )} notes off.`
        );
      }
      setLastGuess(null);
      setNoteToFind(randomInteger(noteRange.first, noteRange.last));
      setDidPlayNoteToFind(false);
      setIsPlaying(true);
    },
  };
}

function useSoundfont(audioContext, instrumentName = "acoustic_grand_piano") {
  let [activeAudioNodes, setActiveAudioNodes] = useState({});
  let [instrument, setInstrument] = useState(null);

  useEffect(() => {
    let format = "mp3";
    let soundfont = "MusyngKite";
    let hostname = "https://d1pzp51pvbm36p.cloudfront.net";
    setInstrument(null);
    Soundfont.instrument(audioContext, instrumentName, {
      format: format,
      soundfont: soundfont,
      nameToUrl: (name, soundfont, format) => {
        return `${hostname}/${soundfont}/${name}-${format}.js`;
      },
    }).then((instrument) => {
      setInstrument(instrument);
    });
  }, [audioContext, instrumentName]);

  let playNote = useCallback(
    (midiNumber) => {
      audioContext.resume().then(() => {
        const audioNode = instrument.play(midiNumber);
        setActiveAudioNodes((o) => ({ ...o, [midiNumber]: audioNode }));
      });
    },
    [instrument, audioContext]
  );

  let stopNote = useCallback(
    (midiNumber) => {
      audioContext.resume().then(() => {
        if (activeAudioNodes[midiNumber]) {
          const audioNode = activeAudioNodes[midiNumber];
          audioNode.stop();
          setActiveAudioNodes((o) => ({ ...o, [midiNumber]: null }));
        }
      });
    },
    [activeAudioNodes, audioContext]
  );

  let stopAllNotes = useCallback(() => {
    audioContext.resume().then(() => {
      Object.values(activeAudioNodes).forEach((audioNode) => {
        if (audioNode) {
          audioNode.stop();
        }
      });
      setActiveAudioNodes({});
    });
  }, [activeAudioNodes, audioContext]);

  return {
    isLoading: !instrument,
    playNote: playNote,
    stopNote: stopNote,
    stopAllNotes: stopAllNotes,
  };
}

function App() {
  let [userDidStart, setUserDidStart] = useState(false);
  return (
    <div className="app">
      {userDidStart ? (
        <ResponsivePiano />
      ) : (
        <button className="start-button" onClick={() => setUserDidStart(true)}>
          Start
        </button>
      )}
    </div>
  );
}

function ResponsivePiano() {
  let audioContext = useMemo(() => {
    return new (window.AudioContext || window.webkitAudioContext)();
  }, []);
  let soundfont = useSoundfont(audioContext);
  let { width } = useWindowWidth();
  let game = useGame(soundfont);

  let playNote = (note) => {
    soundfont.playNote(note);
    game.guessNote(note);
  };

  return (
    <>
      <Piano
        noteRange={noteRange}
        width={width}
        playNote={playNote}
        stopNote={soundfont.stopNote}
        disabled={soundfont.isLoading || game.isPlaying}
      />
      <div className="game-buttons">
        <button className="again-button" onClick={() => game.again()}>
          Again
        </button>
        <button className="next-button" onClick={() => game.next()}>
          Next
        </button>
      </div>
    </>
  );
}

export default App;
