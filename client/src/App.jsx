import { Box, Stack } from "@mui/material";
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Loading from "./components/common/Loading";
import Register from "./pages/Register";
import { useMyInfoQuery } from "./redux/service";

const Error = lazy(() => import("./pages/Error"));
const Home = lazy(() => import("./pages/Protected/Home"));
const ProfileLayout = lazy(
  () => import("./pages/Protected/profile/ProfileLayout")
);
const Replies = lazy(() => import("./pages/Protected/profile/Replies"));
const Repost = lazy(() => import("./pages/Protected/profile/Repost"));
const Threads = lazy(() => import("./pages/Protected/profile/Threads"));
const ProtectedLayout = lazy(
  () => import("./pages/Protected/ProtectedLayout")
);
const Search = lazy(() => import("./pages/Protected/Search"));
const SinglePost = lazy(() => import("./pages/Protected/SinglePost"));

const App = () => {
  const { darkMode } = useSelector((state) => state.service);
  const { data, isError, isLoading } = useMyInfoQuery();

  if (isLoading) {
    return (
      <Stack height="100vh" alignItems="center" justifyContent="center">
        <Loading />
      </Stack>
    );
  }

  if (isError || !data) {
    return (
      <BrowserRouter>
        <Routes>
          <Route exact path="/*" element={<Register />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <>
      <Box minHeight={"100vh"} className={darkMode ? "mode" : ""}>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route exact path="/" element={<ProtectedLayout />}>
                <Route exact path="" element={<Home />} />
                <Route exact path="post/:id" element={<SinglePost />} />
                <Route exact path="search" element={<Search />} />
                <Route exact path="profile" element={<ProfileLayout />}>
                  <Route exact path="threads/:id" element={<Threads />} />
                  <Route exact path="replies/:id" element={<Replies />} />
                  <Route exact path="reposts/:id" element={<Repost />} />
                </Route>
              </Route>
              <Route exact path="*" element={<Error />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </Box>
    </>
  );
};

export default App;
