import Header from "./components/Header";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, minHeight: 0 }}>
        <HomePage />
      </div>
    </div>
  );
}

export default App;