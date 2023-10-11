import db from "@/core/db";

const updateDB = () => {
db.project.update({
    where: { id: "clmkd2l500001hnoc54affdmx"  },
    data: { modelStatus: "paid" },
});
       
};
  
export default updateDB;
  