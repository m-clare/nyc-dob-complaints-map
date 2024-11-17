import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import complaintCategory from "../assets/dobcomplaints_complaint_category.json";
import complaintCategory2021 from "../assets/complaint_category.json";

const descriptionMap = new Map(
  complaintCategory.map((d) => [d.CODE, d["COMPLAINT CATEGORY DESCRIPTION"]])
);

const descriptionMap2021 = new Map(
  complaintCategory2021.map((d) => [
    d["COMPLAINT CATEGORY"],
    d["COMPLAINT CATEGORY DESCRIPTION"],
  ])
);

const priorityMap = new Map(complaintCategory.map((d) => [d.CODE, d.PRIORITY]));

const desiredFields = new Set([
  "bin",
  "unit",
  "date_entered",
  "inspection_date",
  "complaint_number",
  "complaint_category",
  "community_board",
]);

const HUD = ({ rawData }) => {
  const data = JSON.parse(rawData.data);

  const status = rawData.highestPriority;

  const formattedEntry = (item: any) => {
    return (
      <>
        {Object.entries(item).map(([key, value], i) => {
          const formattedKey = key.split("_").join(" ");
          if (desiredFields.has(key) && key === "complaint_category") {
            return (
              <div key={key}>
                <div>
                  <Typography
                    key={`${key}_${i}`}
                    display="inline"
                    fontWeight="700"
                    variant="button"
                  >
                    {formattedKey}:
                  </Typography>
                  <span>{` `}</span>
                  <Typography
                    key={`${value}_${i}`}
                    display="inline"
                    variant="body2"
                  >
                    {descriptionMap.has(value)
                      ? descriptionMap.get(value)
                      : descriptionMap2021.has(value)
                      ? descriptionMap2021.get(value)
                      : value}
                  </Typography>
                </div>
                <div>
                  <Typography
                    key={`${key}_${i}`}
                    display="inline"
                    fontWeight="700"
                    variant="button"
                  >
                    Priority:
                  </Typography>
                  <span>{` `}</span>
                  <Typography
                    key={`${value}_${i}`}
                    display="inline"
                    variant="body2"
                  >
                    {priorityMap.get(value) ??
                      "Unknown Priority (category post-2021)"}
                  </Typography>
                </div>
              </div>
            );
          } else {
            return (
              <div key={key}>
                <div>
                  <Typography
                    key={`${key}_${i}`}
                    display="inline"
                    fontWeight="700"
                    variant="button"
                  >
                    {formattedKey}:
                  </Typography>
                  <span>{` `}</span>
                  <Typography
                    key={`${value}_${i}`}
                    display="inline"
                    variant="body2"
                  >
                    {value}
                  </Typography>
                </div>
              </div>
            );
          }
        })}
      </>
    );
  };
  return (
    <Container>
      <Box
        sx={{
          position: "relative",
        }}
      >
        <Paper
          sx={{
            opacity: 0.8,
            px: 2,
            py: 2,
            maxHeight: "80vh",
            maxWidth: { sm: "60vw", md: "30vw" },
            borderRadius: "16px",
          }}
        >
          <div>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontVariant: "small-caps" }}
            >
              {rawData.address
                .substring(0, rawData.address.length - 6)
                .toLowerCase()}
            </Typography>{" "}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {rawData.address.substring(rawData.address.length - 6)}
            </Typography>
            {status && (
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontVariant: "small-caps" }}
              >
                Highest Priority: {status}
              </Typography>
            )}
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontVariant: "small-caps" }}
            >
              Number of Active Complaints: {rawData.count}
            </Typography>
          </div>
          <div style={{ paddingBottom: 8 }}>
            <Typography
              variant="h6"
              sx={{ fontVariant: "small-caps", fontWeight: 700 }}
            >
              Database Entries
            </Typography>
          </div>
          <Box
            sx={{
              maxHeight: "30vh",
              overflowY: "auto",
            }}
          >
            {data.map((item: object, i: number) => {
              return (
                <div key={i}>
                  {formattedEntry(item)}
                  {!(i === data.length - 1) && (
                    <Divider sx={{ mx: 0.5, my: 1 }} />
                  )}
                </div>
              );
            })}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default HUD;
