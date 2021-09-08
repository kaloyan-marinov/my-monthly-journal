import "@testing-library/jest-dom";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { createStore } from "redux";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";

import { IState } from "./types";
import { JOURNAL_APP_TOKEN } from "./constants";
import App from "./App";
import { TEnhancer, INITIAL_STATE, rootReducer } from "./store";

import { requestHandlers } from "./testHelpers";
import { createMemoryHistory, MemoryHistory } from "history";
import { DefaultRequestBody, MockedRequest, rest, RestHandler } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

/* Create an MSW "request-interception layer". */
const restHandlers: RestHandler<MockedRequest<DefaultRequestBody>>[] = [
  rest.post("/api/users", requestHandlers.mockMultipleFailures),

  rest.post("/api/tokens", requestHandlers.mockMultipleFailures),

  rest.get("/api/user-profile", requestHandlers.mockMultipleFailures),

  rest.get("/api/entries", requestHandlers.mockMultipleFailures),
  rest.post("/api/entries", requestHandlers.mockMultipleFailures),
  rest.put("/api/entries/:id", requestHandlers.mockMultipleFailures),
  rest.delete("/api/entries/:id", requestHandlers.mockMultipleFailures),
];

const requestInterceptionLayer: SetupServerApi = setupServer(...restHandlers);

let enhancer: TEnhancer;
let initState: IState;
let history: MemoryHistory<unknown>;

beforeAll(() => {
  // Enable API mocking.
  requestInterceptionLayer.listen();
});

beforeEach(() => {
  enhancer = applyMiddleware(thunkMiddleware);

  initState = {
    ...INITIAL_STATE,
  };

  history = createMemoryHistory();
});

afterEach(() => {
  requestInterceptionLayer.resetHandlers();
});

afterAll(() => {
  // Disable API mocking.
  requestInterceptionLayer.close();
});

test("initial render (i.e. before/without any user interaction)", async () => {
  // Arrange.
  const realStore = createStore(rootReducer, enhancer);

  // Act.
  render(
    <Provider store={realStore}>
      <Router history={history}>
        <App />
      </Router>
    </Provider>
  );

  // Assert.
  let element: HTMLElement;

  element = await screen.findByText("TO CONTINUE, PLEASE SIGN IN");
  expect(element).toBeInTheDocument();

  element = screen.getByText("Home");
  expect(element).toBeInTheDocument();
  element = screen.getByText("Sign In");
  expect(element).toBeInTheDocument();
  element = screen.getByText("Sign Up");
  expect(element).toBeInTheDocument();

  element = screen.getByText("Welcome to JournalKeeper!");
  expect(element).toBeInTheDocument();
});

test("render after the user has signed in", async () => {
  // Arrange.
  requestInterceptionLayer.use(
    rest.get("/api/user-profile", requestHandlers.mockFetchUserProfile)
  );

  const realStore = createStore(rootReducer, initState, enhancer);

  // Act.
  render(
    <Provider store={realStore}>
      <Router history={history}>
        <App />
      </Router>
    </Provider>
  );

  // Assert.
  let element: HTMLElement;

  element = await screen.findByText("Hello, mocked-John Doe!");
  expect(element).toBeInTheDocument();

  element = screen.getByText("Sign Out");
  expect(element).toBeInTheDocument();
  element = screen.getByText("JournalEntries");
  expect(element).toBeInTheDocument();
  element = screen.getByText("Home");
  expect(element).toBeInTheDocument();
});

test("after the user has signed in, the user clicks on 'Sign Out'", async () => {
  // Arrange.
  requestInterceptionLayer.use(
    rest.get("/api/user-profile", requestHandlers.mockFetchUserProfile)
  );

  const realStore = createStore(rootReducer, initState, enhancer);

  render(
    <Provider store={realStore}>
      <Router history={history}>
        <App />
      </Router>
    </Provider>
  );

  // Act.
  const signOutAnchor: HTMLElement = await screen.findByText("Sign Out");
  fireEvent.click(signOutAnchor);

  // Assert.
  let element: HTMLElement;

  element = await screen.findByText("SIGN-OUT SUCCESSFUL");
  expect(element).toBeInTheDocument();

  element = screen.getByText("Welcome to JournalKeeper!");
  expect(element).toBeInTheDocument();

  element = screen.getByText("Home");
  expect(element).toBeInTheDocument();
  element = screen.getByText("Sign In");
  expect(element).toBeInTheDocument();
  element = screen.getByText("Sign Up");
  expect(element).toBeInTheDocument();
});

test(
  "after the user has signed in, the user clicks on 'Sign Out'" +
    " - that should update the `localStorage` correctly",
  async () => {
    // Arrange.
    requestInterceptionLayer.use(
      rest.get("/api/user-profile", requestHandlers.mockFetchUserProfile)
    );

    localStorage.setItem(JOURNAL_APP_TOKEN, "a-jws-token-issued-by-the-backend");
    // Strictly speaking, the setup logic for this test case renders
    // the next two statements unnecessary-to-have,
    // but including them is of some instructive value.
    initState.auth.token = localStorage.getItem(JOURNAL_APP_TOKEN);
    initState.auth.hasValidToken = true;

    const realStore = createStore(rootReducer, initState, enhancer);
    render(
      <Provider store={realStore}>
        <Router history={history}>
          <App />
        </Router>
      </Provider>
    );

    // Act.
    const signOutAnchor: HTMLElement = await screen.findByText("Sign Out");
    fireEvent.click(signOutAnchor);

    // Assert.
    expect(localStorage.getItem(JOURNAL_APP_TOKEN)).toEqual(null);
  }
);

test(
  "if a user hasn't signed in" +
    " but manually saves a token in their web-browser's `localStorage`," +
    " the frontend application should display only the following navigation links:" +
    " 'Home', 'Sign In', 'Sign Up'",
  async () => {
    // Arrange.

    // Strictly speaking, the setup logic for this test case renders
    // the next two statements unnecessary-to-have,
    // but including them is of some instructive value.
    localStorage.setItem(JOURNAL_APP_TOKEN, "a-jws-token-NOT-issued-by-the-backend");
    initState.auth.token = localStorage.getItem(JOURNAL_APP_TOKEN);

    const realStore = createStore(rootReducer, initState, enhancer);

    // Act.
    render(
      <Provider store={realStore}>
        <Router history={history}>
          <App />
        </Router>
      </Provider>
    );

    // Assert.
    let element: HTMLElement;

    element = await screen.findByText("TO CONTINUE, PLEASE SIGN IN");
    expect(element).toBeInTheDocument();

    element = screen.getByText("Home");
    expect(element).toBeInTheDocument();
    element = screen.getByText("Sign In");
    expect(element).toBeInTheDocument();
    element = screen.getByText("Sign Up");
    expect(element).toBeInTheDocument();
  }
);

xtest(
  "if a user signs in" +
    " and goes on to manually change the URL in her browser's address bar" +
    " to /journal-entries ," +
    " the frontend application should redirect to / (but keep the user signed in)",
  async () => {
    // Arrange.
    requestInterceptionLayer.use(
      rest.get("/api/user-profile", requestHandlers.mockFetchUserProfile),

      rest.get("/api/entries", requestHandlers.mockFetchEntries),
      rest.get("/api/user-profile", requestHandlers.mockFetchUserProfile)
    );

    const realStore = createStore(rootReducer, initState, enhancer);

    // Act:

    // - navigate to the root URL, and mount the application's entire React tree
    history.push("/");

    const { getByText: getByTextFromRootURL } = render(
      <Provider store={realStore}>
        <Router history={history}>
          <App />
        </Router>
      </Provider>
    );

    let element: HTMLElement;

    element = await screen.findByText("Hello, mocked-John Doe!");
    expect(element).toBeInTheDocument();

    // - unamount React trees that were mounted with render
    cleanup();

    // - navigate to the /journal-entries URL,
    //   and mount the application's entire React tree
    console.log("[the test case is]");
    console.log("navigating to the /journal-entries URL");
    console.log("and mounting the application's entire React tree");

    history.push("/journal-entries");

    render(
      <Provider store={realStore}>
        <Router history={history}>
          <App />
        </Router>
      </Provider>
    );

    // Assert.
    await waitFor(() => {
      expect(history.location.pathname).toEqual("/");
    });

    element = screen.getByText("Hello, mocked-John Doe!");
    expect(element).toBeInTheDocument();
  }
);

test(
  "if a user hasn't signed in" +
    " but manually changes the URL in her browser's address bar" +
    " to /journal-entries ," +
    " the frontend application should redirect the user to /sign-in",
  async () => {
    // Arrange.
    const realStore = createStore(rootReducer, initState, enhancer);

    // Act.
    history.push("/journal-entries");

    render(
      <Provider store={realStore}>
        <Router history={history}>
          <App />
        </Router>
      </Provider>
    );

    // Assert.
    const element: HTMLElement = await screen.findByText("TO CONTINUE, PLEASE SIGN IN");
    expect(element).toBeInTheDocument();

    expect(history.location.pathname).toEqual("/sign-in");

    const elements: HTMLElement[] = screen.queryAllByText("Review JournalEntries!");
    expect(elements.length).toEqual(0);
  }
);
