import {
  Avatar,
  Badge,
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { GoHome } from "react-icons/go";
import { IoIosSearch } from "react-icons/io";
import { TbEdit } from "react-icons/tb";
import { CiHeart } from "react-icons/ci";
import { RxAvatar } from "react-icons/rx";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addPostModal } from "../../redux/slice";
import { useState } from "react";
import {
  useAcceptFollowRequestMutation,
  useFollowRequestsQuery,
  useRejectFollowRequestMutation,
} from "../../redux/service";
import { toast } from "react-toastify";

const Navbar = () => {
  const { darkMode, myInfo } = useSelector((state) => state.service);

  const _300 = useMediaQuery("(min-width:300px)");
  const _700 = useMediaQuery("(min-width:700px)");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [requestsAnchor, setRequestsAnchor] = useState(null);
  const showArrow = location.pathname.includes("/post/") && _700;
  const {
    data: followRequestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    refetch: refetchFollowRequests,
  } = useFollowRequestsQuery();
  const [acceptFollowRequest, acceptRequestData] =
    useAcceptFollowRequestMutation();
  const [rejectFollowRequest, rejectRequestData] =
    useRejectFollowRequestMutation();
  const requests = followRequestsData?.requests || [];
  const requestActionLoading =
    acceptRequestData.isLoading || rejectRequestData.isLoading;

  const handleAddPost = () => {
    dispatch(addPostModal(true));
  };

  const handleNavigate = () => {
    navigate(-1);
  };

  const handleRequestAction = async (requesterId, action) => {
    try {
      if (action === "accept") {
        await acceptFollowRequest(requesterId).unwrap();
        toast.success("Follow request accepted !");
      } else {
        await rejectFollowRequest(requesterId).unwrap();
        toast.success("Follow request rejected !");
      }
    } catch (error) {
      toast.error(
        error?.data?.msg || "Unable to update the follow request. Try again."
      );
    }
  };

  return (
    <>
      <Stack
        flexDirection={"row"}
        maxWidth={"100%"}
        justifyContent={"space-around"}
        alignItems={"center"}
      >
        {showArrow ? (
          <FiArrowLeft
            size={_300 ? 32 : 24}
            className="image-icon"
            onClick={handleNavigate}
            color={darkMode ? "white" : "black"}
          />
        ) : null}
        <Link to={"/"} className="link">
          <GoHome size={_300 ? 32 : 24} color={darkMode ? "white" : "black"} />
        </Link>
        <Link to={"/search"} className="link">
          <IoIosSearch
            size={_300 ? 32 : 24}
            color={darkMode ? "white" : "black"}
          />
        </Link>
        <TbEdit
          size={_300 ? 32 : 24}
          className="image-icon"
          color={darkMode ? "white" : "black"}
          onClick={handleAddPost}
        />
        <IconButton
          aria-label="Pending follow requests"
          aria-haspopup="true"
          aria-expanded={Boolean(requestsAnchor)}
          onClick={(event) =>
            setRequestsAnchor(requestsAnchor ? null : event.currentTarget)
          }
          sx={{ color: darkMode ? "white" : "black", p: 0.5 }}
        >
          <Badge badgeContent={requests.length} color="error" max={99}>
            <CiHeart size={_300 ? 32 : 24} />
          </Badge>
        </IconButton>
        <Link to={`/profile/threads/${myInfo?._id}`} className="link">
          <RxAvatar
            size={_300 ? 32 : 24}
            color={darkMode ? "white" : "black"}
          />
        </Link>
      </Stack>
      <Popover
        open={Boolean(requestsAnchor)}
        anchorEl={requestsAnchor}
        onClose={() => setRequestsAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            width: "min(360px, calc(100vw - 24px))",
            maxHeight: "min(480px, 70vh)",
            p: 2,
            bgcolor: darkMode ? "#242424" : "white",
            color: darkMode ? "white" : "black",
          },
        }}
      >
        <Stack gap={1.5}>
          <Typography variant="h6">Follow requests</Typography>
          {requestsLoading ? (
            <Stack alignItems="center" p={2}>
              <CircularProgress size={24} />
            </Stack>
          ) : requestsError ? (
            <Stack gap={1}>
              <Typography color="error">
                Could not load follow requests.
              </Typography>
              <Button onClick={refetchFollowRequests}>Try again</Button>
            </Stack>
          ) : requests.length === 0 ? (
            <Typography color="text.secondary">
              You have no pending follow requests.
            </Typography>
          ) : (
            requests.map((request) => (
              <Stack
                key={request._id}
                direction="row"
                alignItems="center"
                gap={1}
              >
                <Avatar
                  src={request.profilePic}
                  alt={request.userName}
                  sx={{ width: 40, height: 40 }}
                />
                <Stack flex={1} minWidth={0}>
                  <Link
                    to={`/profile/threads/${request._id}`}
                    className="link"
                    onClick={() => setRequestsAnchor(null)}
                  >
                    <Typography
                      fontWeight="bold"
                      noWrap
                      color={darkMode ? "white" : "black"}
                    >
                      {request.userName}
                    </Typography>
                  </Link>
                  {request.bio && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {request.bio}
                    </Typography>
                  )}
                </Stack>
                <Button
                  size="small"
                  variant="contained"
                  disabled={requestActionLoading}
                  onClick={() =>
                    handleRequestAction(request._id, "accept")
                  }
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  disabled={requestActionLoading}
                  onClick={() => handleRequestAction(request._id, "reject")}
                >
                  Reject
                </Button>
              </Stack>
            ))
          )}
        </Stack>
      </Popover>
    </>
  );
};

export default Navbar;
