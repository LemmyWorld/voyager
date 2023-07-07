import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
} from "@ionic/react";
import { FetchFn } from "../../features/feed/Feed";
import { useCallback, useContext } from "react";
import PostSort from "../../features/feed/postSort/PostSort";
import { ListingType } from "lemmy-js-client";
import { useBuildGeneralBrowseLink } from "../../helpers/routes";
import useClient from "../../helpers/useClient";
import { LIMIT } from "../../services/lemmy";
import { useAppSelector } from "../../store";
import PostCommentFeed, {
  PostCommentItem,
} from "../../features/feed/PostCommentFeed";
import { jwtSelector } from "../../features/auth/authSlice";
import TitleSearch from "../../features/community/titleSearch/TitleSearch";
import { TitleSearchProvider } from "../../features/community/titleSearch/TitleSearchProvider";
import TitleSearchResults from "../../features/community/titleSearch/TitleSearchResults";
import {
  PostSortContext,
  PostSortContextProvider,
} from "../../features/feed/postSort/PostSortProvider";

interface SpecialFeedProps {
  type: ListingType;
}

export default function SpecialFeedPageWithSort(props: SpecialFeedProps) {
  return (
    <PostSortContextProvider>
      <SpecialFeedPage {...props} />
    </PostSortContextProvider>
  );
}

function SpecialFeedPage({ type }: SpecialFeedProps) {
  const buildGeneralBrowseLink = useBuildGeneralBrowseLink();

  const client = useClient();
  const { sort } = useContext(PostSortContext);
  const jwt = useAppSelector(jwtSelector);

  const fetchFn: FetchFn<PostCommentItem> = useCallback(
    async (page) => {
      const response = await client.getPosts({
        limit: LIMIT,
        page,
        sort,
        type_: type,
        auth: jwt,
      });
      return response.posts;
    },
    [client, sort, type, jwt]
  );

  return (
    <TitleSearchProvider>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton
                text="Communities"
                defaultHref={buildGeneralBrowseLink("")}
              />
            </IonButtons>

            <TitleSearch name={listingTypeTitle(type)}>
              <IonButtons slot="end">
                <PostSort />
              </IonButtons>
            </TitleSearch>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <PostCommentFeed fetchFn={fetchFn} />
          <TitleSearchResults />
        </IonContent>
      </IonPage>
    </TitleSearchProvider>
  );
}

function listingTypeTitle(type: ListingType): string {
  switch (type) {
    case "All":
    case "Local":
      return type;
    case "Subscribed":
      return "Home";
  }
}
