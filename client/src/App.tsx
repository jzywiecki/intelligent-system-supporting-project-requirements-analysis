import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ThemeProvider } from "@/components/ThemeProvider";
import ProjectsView from './pages/ProjectsView';
import CreateProject from './pages/CreateProject';
import Profile from './pages/Profile';
import NameList from './pages/projectPages/NameList';
import RequirementsList from './pages/projectPages/RequirementsList';
import RiskList from './pages/projectPages/RisksList';
import MottoList from './pages/projectPages/MottoList';
import SpecificationsList from './pages/projectPages/SpecificationsList';
import StrategyList from './pages/projectPages/StrategyList';
import ActorList from './pages/projectPages/ActorsList';
import ElevatorSpeech from './pages/projectPages/ElevatorSpeech';
import BusinessScenario from './pages/projectPages/BusinesScenario';
import { RegenerateProvider } from './components/contexts/RegenerateContext';
import Home from './pages/Home';
import UMLDiagrams from './pages/projectPages/umlDiagrams';
import ProjectTimeline from './pages/projectPages/ProjectTimeline';
import DatabaseDiagram from './pages/projectPages/DatabaseDiagram';
import RegisterView from './pages/RegisterView';
import LoginView from './pages/LoginView';
import { UserProvider } from './components/UserProvider';
import SearchAndAddFriends from './pages/SearchAndAddFriends';
import ProjectsSettings from './pages/ProjectSettings';
import { SnackbarProvider } from 'notistack';
import { closeSnackbar } from 'notistack'
import { IoIosClose } from "react-icons/io";
import './styles/styles.css'
import ProjectDetailsReadme from './pages/ProjectDetailsReadme';
import Layout from './pages/Layout';
import LogoList from './pages/projectPages/LogoList';
import { UserEditsProvider } from './pages/projectsUtils/UserEditsProvider';
import ErrorPage from './pages/ErrorPage';
import ElevatorSpeechList from './pages/projectPages/ElevatorSpeech';

function App() {
  return (
    <SnackbarProvider maxSnack={3} autoHideDuration={3500}
      // ref={myRef}
      action={(snackbarId) => (
        <button onClick={() => closeSnackbar(snackbarId)}>
          <IoIosClose size={20} />
        </button>
      )}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}>
      <UserProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <UserEditsProvider>
            <RegenerateProvider>
              <div className="">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="register" element={<RegisterView />} />
                  <Route path="login" element={<LoginView />} />
                  <Route path="/projects" element={<ProjectsView />} />
                  <Route path="/projects/:projectID/editor" element={<Layout />}>
                    <Route path="settings" element={<ProjectsSettings />} />
                    <Route path="summary" element={<ProjectDetailsReadme />} />
                    <Route path="name" element={<NameList />} />
                    <Route path="requirements" element={<RequirementsList />} />
                    <Route path="risk" element={<RiskList />} />
                    <Route path="motto" element={<MottoList />} />
                    <Route path="specifications" element={<SpecificationsList />} />
                    <Route path="strategy" element={<StrategyList />} />
                    <Route path="actors" element={<ActorList />} />
                    <Route path="elevator-speech" element={<ElevatorSpeechList />} />
                    <Route path="business-scenario" element={<BusinessScenario />} />
                    <Route path="uml" element={<UMLDiagrams />} />
                    <Route path="schedule" element={<ProjectTimeline />} />
                    <Route path="database-diagram" element={<DatabaseDiagram />} />
                    <Route path="logo" element={<LogoList />} />
                  </Route>
                  <Route path="/create-project" element={<CreateProject />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/collaborators" element={<SearchAndAddFriends />} />
                  <Route path="not-found" element={<ErrorPage />} />
                  <Route path="*" element={<ErrorPage errorCode={404} />} />

                </Routes>
              </div>
            </RegenerateProvider>
          </UserEditsProvider>
        </ThemeProvider>
      </UserProvider>
    </SnackbarProvider>
  );
}

export default App;
