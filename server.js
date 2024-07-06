const express = require("express");
const { spawn } = require("child_process");
const { default: axios } = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3030;

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://git-showcase-frontend.vercel.app",
    ],
  })
);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.post("/api/contributions", async (req, res) => {
  try {
    const { name, year } = req.body;
    const response = await axios.get(
      `https://skyline.github.com/${name}/${year}.json`
    );
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching GitHub contributions");
  }
});

app.get("/api/github/avatar/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const response = await axios.get(
      `https://api.github.com/users/${username}`,
      {
        headers: {
          // Include the token in the Authorization header
          Authorization: `token ${process.env.github_key}`,
        },
      }
    );
    res.send({ avatarUrl: response.data.avatar_url });
  } catch (error) {
    console.error("Error fetching user data:", error);
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).send({ message: "Error fetching GitHub user data" });
    }
  }
});

app.post("/api/github/contributions", async (req, res) => {
  const { username } = req.body;

  // Adjust these dates as necessary
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const formattedFromDate = fromDate.toISOString();
  const toDate = new Date().toISOString();

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      {
        query: `
          query getUserContributions($username: String!, $fromDate: DateTime!, $toDate: DateTime!) {
            user(login: $username) {
              contributionsCollection(from: $fromDate, to: $toDate) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      contributionCount
                      date
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          username,
          fromDate: formattedFromDate,
          toDate,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.github_key}`,
          "Content-Type": "application/json",
        },
      }
    );

    // let contributionCountArray = [];
    let contributionCountArray =
      response.data.data.user.contributionsCollection.contributionCalendar
        .weeks;
    let startingMonth = "";
    let totalContributions =
      response.data.data.user.contributionsCollection.contributionCalendar
        .totalContributions;

    startingMonth =
      response.data.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays[0].date.split(
        "-"
      )[1];

    // response.data.data.user.contributionsCollection.contributionCalendar.weeks.forEach(
    //   (week) => {
    //     week.contributionDays.map((day) =>
    //       contributionCountArray.push(day.contributionCount)
    //     );
    //   }
    // );

    res.json({
      contributionCountArray,
      startingMonth,
      totalContributions,
    });
    // res.json(
    //   response.data.data.user.contributionsCollection.contributionCalendar
    // );
  } catch (error) {
    console.error("Error fetching GitHub contributions:", error);
    res.status(500).send("Error fetching GitHub contributions");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
