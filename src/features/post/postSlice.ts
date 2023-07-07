import {
  Dictionary,
  PayloadAction,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { PostView } from "lemmy-js-client";
import { AppDispatch, RootState } from "../../store";
import { clientSelector, handleSelector, jwtSelector } from "../auth/authSlice";
import { IPostMetadata, db } from "../../services/db";

interface PostState {
  postById: Dictionary<PostView>;
  postHiddenById: Dictionary<boolean>;
  postVotesById: Dictionary<1 | -1 | 0>;
  postSavedById: Dictionary<boolean>;
}

const initialState: PostState = {
  postById: {},
  postHiddenById: {},
  postVotesById: {},
  postSavedById: {},
};

export const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    updatePostVote: (
      state,
      action: PayloadAction<{ postId: number; vote: -1 | 1 | 0 | undefined }>
    ) => {
      state.postVotesById[action.payload.postId] = action.payload.vote;
    },
    updatePostSaved: (
      state,
      action: PayloadAction<{ postId: number; saved: boolean | undefined }>
    ) => {
      state.postSavedById[action.payload.postId] = action.payload.saved;
    },
    resetPosts: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(receivedPosts.fulfilled, (state, action) => {
        const { posts, postHiddenById } = action.payload;

        for (const post of posts) {
          state.postById[post.post.id] = post;
          state.postHiddenById[post.post.id] = postHiddenById[post.post.id];

          if (post.my_vote)
            state.postVotesById[post.post.id] = post.my_vote as 1 | -1;

          if (post.saved) state.postSavedById[post.post.id] = post.saved;
        }
      })
      .addCase(updatePostHidden.fulfilled, (state, action) => {
        if (!action.payload) return;

        state.postHiddenById[action.payload.post_id] = !!action.payload.hidden;
      });
  },
});

export const updatePostHidden = createAsyncThunk(
  "post/updatePostHidden",
  async ({ postId, hidden }: { postId: number; hidden: boolean }, thunkAPI) => {
    const rootState = thunkAPI.getState() as RootState;
    const handle = handleSelector(rootState);

    if (!handle) return;

    const newPostMetadata: IPostMetadata = {
      post_id: postId,
      user_handle: handle,
      hidden: hidden ? 1 : 0,
      hidden_updated_at: Date.now(),
    };

    await db.upsertPostMetadata(newPostMetadata);

    return newPostMetadata;
  }
);

export const receivedPosts = createAsyncThunk(
  "post/receivedPosts",
  async (posts: PostView[], thunkAPI) => {
    const rootState = thunkAPI.getState() as RootState;
    const handle = handleSelector(rootState);
    const postHiddenById: Dictionary<boolean> = {};

    if (!handle)
      return {
        posts,
        postHiddenById,
      };

    const receivedPostsIds = posts.map((post) => post.post.id);
    const postMetadatas = await db.getPostMetadatas(receivedPostsIds, handle);

    for (const postMetadata of postMetadatas) {
      postHiddenById[postMetadata.post_id] = !!postMetadata.hidden;
    }

    return {
      posts,
      postHiddenById,
    };
  }
);

// Action creators are generated for each case reducer function
export const { updatePostVote, resetPosts, updatePostSaved } =
  postSlice.actions;

export default postSlice.reducer;

export const savePost =
  (postId: number, save: boolean) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const oldSaved = getState().post.postSavedById[postId];

    dispatch(updatePostSaved({ postId, saved: save }));

    const jwt = jwtSelector(getState());

    if (!jwt) throw new Error("Not authorized");

    try {
      await clientSelector(getState())?.savePost({
        post_id: postId,
        save,
        auth: jwt,
      });
    } catch (error) {
      dispatch(updatePostSaved({ postId, saved: oldSaved }));

      throw error;
    }
  };

export const voteOnPost =
  (postId: number, vote: 1 | -1 | 0) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const oldVote = getState().post.postVotesById[postId];

    dispatch(updatePostVote({ postId, vote }));

    const jwt = jwtSelector(getState());

    if (!jwt) throw new Error("Not authorized");

    try {
      await clientSelector(getState())?.likePost({
        post_id: postId,
        score: vote,
        auth: jwt,
      });
    } catch (error) {
      dispatch(updatePostVote({ postId, vote: oldVote }));

      throw error;
    }
  };

export const getPost =
  (id: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const jwt = jwtSelector(getState());

    const result = await clientSelector(getState()).getPost({
      id,
      auth: jwt,
    });

    if (result) dispatch(receivedPosts([result.post_view]));
  };

export const hidePost = (postId: number) => async (dispatch: AppDispatch) => {
  dispatch(updatePostHidden({ postId, hidden: true }));
};

export const unhidePost = (postId: number) => async (dispatch: AppDispatch) => {
  dispatch(updatePostHidden({ postId, hidden: false }));
};

export const postHiddenByIdSelector = (state: RootState) => {
  return state.post.postHiddenById;
};
