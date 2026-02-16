import { useEffect, useState } from "react";
import NotesList from "../components/NotesList";

function HomePage() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch("http://127.0.0.1:8000/notes");
        const data = await res.json();
        setNotes(data);
      } catch (err) {
        console.error("Failed to load notes:", err);
      }
    }

    loadNotes();
  }, []);

return (
  <div>
    <NotesList notes={notes} />
  </div>
);


}

export default HomePage;
