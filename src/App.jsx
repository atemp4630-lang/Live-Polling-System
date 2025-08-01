import LandingPage from "./components/LandingPage";
import PreQuestion from "./components/PreQuestion";
import StudentPage from "./components/StudentPage";
import TeacherPage from "./components/TeacherPage";
import { Routes, Route } from "react-router-dom";
import ChatBox from "./components/ChatBox";
import TeacherQuePage from "./components/TeacherQuePage";
import StudentQuePage from "./components/StudentQuePage";
import KickOut from "./components/KickOut";
import ViewPollHistory from "./components/ViewPollHistory";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student" element={<StudentPage />} />
        <Route path="/teacher" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherPage />
          </ProtectedRoute>
        } />
        <Route path="/PreQuestion" element={
          <ProtectedRoute>
            <PreQuestion />
          </ProtectedRoute>
        } />
        <Route path="/tque" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherQuePage />
          </ProtectedRoute>
        } />
        <Route path="/sque" element={
          <ProtectedRoute requiredRole="student">
            <StudentQuePage />
          </ProtectedRoute>
        } />
        <Route path="/kick-out" element={<KickOut />} />
        <Route path="/poll-hist" element={
          <ProtectedRoute requiredRole="teacher">
            <ViewPollHistory />
          </ProtectedRoute>
        } />
      </Routes>
      <ChatBox />
    </>
  );
};

export default App;
