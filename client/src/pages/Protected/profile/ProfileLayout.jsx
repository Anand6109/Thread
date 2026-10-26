import {
  Avatar,
  Button,
  Chip,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { FaInstagram } from "react-icons/fa";
import { Link, Outlet, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { editProfileModal } from "../../../redux/slice";
import {
  useFollowUserMutation,
  useUserDetailsQuery,
} from "../../../redux/service";
import { useEffect } from "react";
import EditProfile from "../../../components/modals/EditProfile";
import { Bounce, toast } from "react-toastify";
import { Helmet } from "react-helmet-async";

const   ProfileLayout = () => {
  const dispatch = useDispatch();
  const params = useParams();

  const { data } = useUserDetailsQuery(params?.id, {
    skip: !params?.id,
  });
  const [followUser, followUserData] = useFollowUserMutation();

  const { darkMode, myInfo } = useSelector((state) => state.service);

  const myAccount = Boolean(data?.user && data.user._id === myInfo?._id);
  const isFollowing = Boolean(data?.user?.isFollowing);
  const isRequestPending = Boolean(data?.user?.isFollowRequestPending);

  const _300 = useMediaQuery("(min-width:300px)");
  const _500 = useMediaQuery("(min-width:500px)");
  const _700 = useMediaQuery("(min-width:700px)");

  const handleFollow = async () => {
    if (data) {
      await followUser(data.user._id);
    }
  };

  const handleOpenEditModal = () => {
    dispatch(editProfileModal(true));
  };

  useEffect(() => {
    if (followUserData.isSuccess) {
      toast.success(followUserData.data.msg, {
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        transition: Bounce,
      });
    }
    if (followUserData.isError) {
      toast.error(followUserData.error?.data?.msg || "Could not update follow status.", {
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        transition: Bounce,
      });
    }
  }, [
    followUserData.isSuccess,
    followUserData.isError,
    followUserData.data?.msg,
    followUserData.error?.data?.msg,
  ]);

  return (
    <>
      <Helmet>
        <title>
          {data
            ? data.user
              ? data.user.userName + " | Threads Clone"
              : "Threads Clone | App by Anand "
            : "Threads Clone | App by Anand "}
        </title>
      </Helmet>
      <Stack
        flexDirection={"column"}
        gap={2}
        p={2}
        m={2}
        width={_700 ? "800px" : "90%"}
        mx={"auto"}
      >
        <Stack
          flexDirection={"row"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Stack flexDirection={"column"} gap={1}>
            <Typography
              variant="h2"
              fontWeight={"bold"}
              fontSize={_300 ? "2rem" : "1rem"}
            >
              {data ? (data.user ? data.user.userName : "") : ""}
            </Typography>
            <Stack flexDirection={"row"} alignItems={"center"} gap={1}>
              <Typography variant="h2" fontSize={_300 ? "1rem" : "0.8rem"}>
                {data?.user ? `@${data.user.userName}` : ""}
              </Typography>
              <Chip
                label="threads.net"
                size="small"
                sx={{ fontSize: _300 ? "0.8rem" : "0.6rem" }}
              />
            </Stack>
          </Stack>
          <Avatar
            src={data ? (data.user ? data.user.profilePic : "") : ""}
            alt={data ? (data.user ? data.user.userName : "") : ""}
            sx={{ width: _300 ? 60 : 40, height: _300 ? 60 : 40 }}
          />
        </Stack>
        <Typography variant="subtitle2">
          {data ? (data.user ? data.user.bio : "") : ""}
        </Typography>
        <Stack
          flexDirection={"row"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Typography variant="subtitle2" color={"gray"}>
            {data
              ? data.user
                ? data.user.followersCount > 0
                  ? `${data.user.followersCount} followers`
                  : "No Followers"
                : ""
              : ""}
          </Typography>
          <FaInstagram size={_300 ? 40 : 24} />
        </Stack>
      </Stack>
      <Button
        size="large"
        sx={{
          color: darkMode ? "whitesmoke" : "black",
          width: _700 ? "800px" : "90%",
          mx: "auto",
          textAlign: "center",
          border: "1px solid gray",
          borderRadius: "10px",
          ":hover": {
            cursor: "pointer",
          },
        }}
        disabled={!myAccount && followUserData.isLoading}
        onClick={myAccount ? handleOpenEditModal : handleFollow}
      >
        {myAccount
          ? " Edit Profile"
          : isRequestPending
            ? "Requested"
            : isFollowing
              ? "Unfollow"
              : "Follow user"}
      </Button>
      <Stack
        flexDirection={"row"}
        justifyContent={"space-evenly"}
        my={5}
        pb={2}
        borderBottom={"2px solid gray"}
        fontSize={_500 ? "1.2rem" : _300 ? "1.1rem" : "0.9rem"}
        width={_700 ? "800px" : "90%"}
        mx={"auto"}
      >
        <Link
          to={`/profile/threads/${data?.user._id}`}
          className={`link ${darkMode ? "mode" : ""}`}
        >
          Threads
        </Link>
        <Link
          to={`/profile/replies/${data?.user._id}`}
          className={`link ${darkMode ? "mode" : ""}`}
        >
          Replies
        </Link>
        <Link
          to={`/profile/reposts/${data?.user._id}`}
          className={`link ${darkMode ? "mode" : ""}`}
        >
          Reposts
        </Link>
      </Stack>
      <Outlet />
      <EditProfile />
    </>
  );
};

export default ProfileLayout;
