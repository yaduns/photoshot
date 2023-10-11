const db = require("./src/core/db");
async function updateProject() {
  const updatedProject = await db.project.update({
    where: { id: "clmkd2l500001hnoc54affdmx" },
    data: { modelStatus: "paid" },
  });
}
updateProject();