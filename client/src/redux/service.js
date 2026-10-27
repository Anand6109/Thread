import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  addMyInfo,
  addSingle,
  addToAllPost,
  addUser,
  deleteThePost,
} from "./slice";

const serverUrl =
  import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "") || "http://localhost:5000";

const baseQuery = fetchBaseQuery({
  baseUrl: `${serverUrl}/api/`,
  credentials: "include",
});

const customBaseQuery = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  
  // Suppress 401 errors for /me endpoint after logout
  if (result.error?.status === 401 && args.url === "me") {
    return { data: null };
  }
  
  return result;
};

export const serviceApi = createApi({
  reducerPath: "serviceApi",
  baseQuery: customBaseQuery,
  keepUnusedDataFor: 60 * 60 * 24 * 7,
  tagTypes: ["Post", "User", "Me", "FollowRequests"],
  endpoints: (builder) => ({
    signin: builder.mutation({
      query: (data) => ({
        url: "signin",
        method: "POST",
        body: data,
      }),
      invalidateTags: ["Me"],
    }),
    login: builder.mutation({
      query: (data) => ({
        url: "login",
        method: "POST",
        body: data,
      }),
      invalidateTags: ["Me"],
    }),
    myInfo: builder.query({
      query: () => ({
        url: "me",
        method: "GET",
      }),
      providesTags: ["Me"],
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(addMyInfo(data));
          }
        } catch (err) {
          console.log(err);
        }
      },
    }),
    logoutMe: builder.mutation({
      query: () => ({
        url: "logout",
        method: "POST",
      }),
      invalidatesTags: ["Me"],
    }),
    userDetails: builder.query({
      query: (id) => ({
        url: `user/${id}`,
        method: "GET",
      }),
      providesTags: ["User"],
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(addUser(data));
        } catch (err) {
          console.log(err);
        }
      },
    }),
    searchUsers: builder.query({
      query: (query) => ({
        url: `users/search/${query}`,
        method: "GET",
      }),
    }),
    followUser: builder.mutation({
      query: (id) => ({
        url: `user/follow/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["User"],
    }),
    followRequests: builder.query({
      query: () => ({
        url: "follow-requests",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.requests.map(({ _id }) => ({
                type: "FollowRequests",
                id: _id,
              })),
              { type: "FollowRequests", id: "LIST" },
            ]
          : [{ type: "FollowRequests", id: "LIST" }],
    }),
    acceptFollowRequest: builder.mutation({
      query: (id) => ({
        url: `follow-requests/${id}/accept`,
        method: "PUT",
      }),
      invalidatesTags: ["FollowRequests", "User"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          serviceApi.util.updateQueryData("followRequests", undefined, (draft) => {
            draft.requests = draft.requests.filter(
              (request) => request._id !== id
            );
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    rejectFollowRequest: builder.mutation({
      query: (id) => ({
        url: `follow-requests/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FollowRequests", "User"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          serviceApi.util.updateQueryData("followRequests", undefined, (draft) => {
            draft.requests = draft.requests.filter(
              (request) => request._id !== id
            );
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: "update",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Me"],
    }),

    addPost: builder.mutation({
      query: (data) => ({
        url: `post`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Post"],
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(addSingle(data));
        } catch (err) {
          console.log(err);
        }
      },
    }),
    allPost: builder.query({
      query: (page) => ({
        url: `post?page=${page}`,
        method: "GET",
      }),
      providesTags: (result) => {
        return result
          ? [
              ...result.posts.map(({ _id }) => ({ type: "Post", id: _id })),
              { type: "Post", id: "LIST" },
            ]
          : [{ type: "Post", id: "LIST" }];
      },
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(addToAllPost(data));
        } catch (err) {
          console.log(err);
        }
      },
    }),
    deletePost: builder.mutation({
      query: (id) => ({
        url: `post/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(deleteThePost(data));
        } catch (err) {
          console.log(err);
        }
      },
    }),
    likePost: builder.mutation({
      query: (id) => ({
        url: `post/like/${id}`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
    singlePost: builder.query({
      query: (id) => ({
        url: `post/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
    repost: builder.mutation({
      query: (id) => ({
        url: `repost/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["User"],
    }),

    addComment: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `comment/${id}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    deleteComment: builder.mutation({
      query: ({ postId, id }) => ({
        url: `comment/${postId}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
      ],
    }),
  }),
});

export const {
  useSigninMutation,
  useLoginMutation,
  useMyInfoQuery,
  useLogoutMeMutation,
  useUserDetailsQuery,
  useLazySearchUsersQuery,
  useAllPostQuery,
  useFollowUserMutation,
  useFollowRequestsQuery,
  useAcceptFollowRequestMutation,
  useRejectFollowRequestMutation,
  useAddCommentMutation,
  useAddPostMutation,
  useDeleteCommentMutation,
  useDeletePostMutation,
  useLikePostMutation,
  useRepostMutation,
  useSinglePostQuery,
  useUpdateProfileMutation,
} = serviceApi;
