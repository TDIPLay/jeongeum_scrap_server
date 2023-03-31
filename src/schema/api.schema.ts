import S from 'fluent-json-schema'

export const apiSchema = {

    queryString: S.object(),
    params: S.object(),
    headers: S.object(),
}

export const postSchema = {
    body: S.object()
        .prop('did_branch_id', S.number().required())
        .prop('settop_box_id', S.number().required())
        .prop('did_media_group_id', S.number().required())
        .prop('log', S.array().required()),
    queryString: S.object(),
    params: S.object(),
    headers: S.object(),
}

export const signupSchema = {
    body: S.object(),
    queryString: S.object(),
    params: S.object(),
    headers: S.object(),
}
