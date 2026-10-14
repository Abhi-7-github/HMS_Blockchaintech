import React from "react";
import RoleRoute from "./RoleRoute";

const AdminRoute = ({ children }) => {
    return <RoleRoute allowedRoles={["ADMIN"]}>{children}</RoleRoute>;
};

export default AdminRoute;
