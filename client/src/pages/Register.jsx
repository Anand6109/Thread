import {
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { useEffect, useState } from "react";
import { useLoginMutation, useSigninMutation } from "../redux/service";
import { Bounce, toast } from "react-toastify";
import Loading from "../components/common/Loading";

const Register = () => {
  const _700 = useMediaQuery("(min-width:700px)");

  const [signinUser, signinUserData] = useSigninMutation();
  const [loginUser, loginUserData] = useLoginMutation();

  const [login, setLogin] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordBytes = new TextEncoder().encode(password).length;
  const userNameIsValid =
    userName.trim().length >= 1 && userName.trim().length <= 32;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordIsValid = password.length >= 8 && passwordBytes <= 72;

  const toggleLogin = () => {
    setLogin((pre) => !pre);
  };

  const handleLogin = async () => {
    const data = {
      email,
      password,
    };
    await loginUser(data);
  };

  const handleRegister = async () => {
    if (!userNameIsValid) {
      toast.error("Username must be between 1 and 32 characters.");
      return;
    }
    if (!emailIsValid) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!passwordIsValid) {
      toast.error("Password must be at least 8 characters and at most 72 UTF-8 bytes.");
      return;
    }
    const data = {
      userName,
      email,
      password,
    };
    await signinUser(data);
  };

  useEffect(() => {
    if (signinUserData.isSuccess) {
      toast.success(signinUserData.data.msg, {
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        transition: Bounce,
      });
      setTimeout(() => {
        window.location.replace("/");
      }, 1500);
    }
    if (signinUserData.isError) {
      toast.error(
        signinUserData.error?.data?.msg ||
          "Could not reach the server. Check your connection and try again.",
        {
          position: "top-center",
          autoClose: 2500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
          transition: Bounce,
        }
      );
    }
  }, [
    signinUserData.isSuccess,
    signinUserData.isError,
    signinUserData.data?.msg,
    signinUserData.error?.data?.msg,
  ]);

  useEffect(() => {
    if (loginUserData.isSuccess) {
      toast.success(loginUserData.data.msg, {
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        transition: Bounce,
      });
      setTimeout(() => {
        window.location.replace("/");
      }, 1500);
    }
    if (loginUserData.isError) {
      toast.error(loginUserData.error?.data?.msg || "Could not sign in.", {
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
    loginUserData.isSuccess,
    loginUserData.isError,
    loginUserData.data?.msg,
    loginUserData.error?.data?.msg,
  ]);

  if (signinUserData.isLoading || loginUserData.isLoading) {
    return (
      <Stack height={"90vh"} alignItems={"center"} justifyContent={"center"}>
        <Loading />
      </Stack>
    );
  }

  return (
    <>
      <Stack
        width={"100%"}
        height={"100vh"}
        flexDirection={"row"}
        justifyContent={"center"}
        alignItems={"center"}
        sx={
          _700
            ? {
                backgroundImage: 'url("/register-bg.webp")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 600px",
              }
            : null
        }
      >
        <Stack
          flexDirection={"column"}
          width={_700 ? "40%" : "90%"}
          gap={2}
          mt={_700 ? 20 : 0}
        >
          <Typography
            variant="h5"
            fontSize={_700 ? "1.5rem" : "1rem"}
            fontWeight={"bold"}
            alignSelf={"center"}
          >
            {login ? " Login with email" : " Register with email"}
          </Typography>
          {login ? null : (
            <TextField
              variant="outlined"
              placeholder="Enter your userName..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              error={userName.length > 0 && !userNameIsValid}
              inputProps={{ maxLength: 32 }}
              autoComplete="username"
            />
          )}
          <TextField
            variant="outlined"
            placeholder="Enter your Email..."
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={email.length > 0 && !emailIsValid}
            autoComplete="email"
          />
          <TextField
            variant="outlined"
            placeholder="Enter your Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete={login ? "current-password" : "new-password"}
            error={!login && password.length > 0 && !passwordIsValid}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    edge="end"
                    type="button"
                  >
                    {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            size="large"
            sx={{
              width: "100%",
              height: 52,
              bgcolor: "green",
              color: "white",
              fontSize: "1rem",
              ":hover": {
                bgcolor: "blue",
                cursor: "pointer",
              },
            }}
            onClick={login ? handleLogin : handleRegister}
          >
            {login ? "Login" : "  Sign Up"}
          </Button>
          <Typography
            variant="subtitle2"
            fontSize={_700 ? "1.3rem" : "1rem"}
            alignSelf={"center"}
          >
            {login ? "Don`t have an account ?" : " Already have an accout ?"}
            <span className="login-link" onClick={toggleLogin}>
              {" "}
              {login ? "Sign up" : "Login"}
            </span>
          </Typography>
        </Stack>
      </Stack>
    </>
  );
};

export default Register;
