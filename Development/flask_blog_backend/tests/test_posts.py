import uuid
from io import BytesIO
from werkzeug.datastructures import MultiDict, FileStorage


from tests.utils import register_any_user, login


# pytest tests/test_posts.py

def test_create_post_without_image_returns_400(client):
    # Register and approve an author
    author_user, author_email = register_any_user(client, "author", approved=True)

    # Login and get access token
    token = login(client, author_email).json["access_token"]

    # Attempt to create a post without an image
    response = client.post(
        "/api/posts",  # Use correct route prefix if defined in blueprint
        headers={"Authorization": f"Bearer {token}"},
        data={
            "title": "NoImage",
            "content": "Content with no image",
            "category_id": 1
        }
    )

    # Assert that the request fails with 400 Bad Request
    assert response.status_code == 400
    assert "image" in response.get_json().get("msg", "").lower()



def test_post_creation_by_roles(client):
    roles = ["superadmin", "admin", "author"]

    for role in roles:
        # Register and approve the user
        user, email = register_any_user(client, role, approved=True)
        token = login(client, email).json["access_token"]

        # Create category (use admin token if not superadmin)
        category_creator = token
        if role != "admin":
            # Admin is needed to create the category
            admin, admin_email = register_any_user(client, "admin", approved=True)
            admin_token = login(client, admin_email).json["access_token"]
            category_creator = admin_token

        category_resp = client.post(
            "/api/categories/create_category",
            headers={"Authorization": f"Bearer {category_creator}"},
            json={"name": f"{role.capitalize()} Category {uuid.uuid4().hex[:6]}"}
        )
        assert category_resp.status_code == 201
        category_id = category_resp.json["id"]

        # Create post with image
        image_data = (BytesIO(b"fake image content"), "post_image.jpg")
        post_resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=MultiDict([
                ("title", f"{role.capitalize()} Post {uuid.uuid4().hex[:6]}"),
                ("content", f"This is a post by a {role}."),
                ("category_id", str(category_id)),
                ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
            ]),
            content_type="multipart/form-data"
        )
        assert post_resp.status_code == 201, f"{role} failed to create post"
        json_data = post_resp.get_json()
        assert "post_id" in json_data, f"No post_id returned for {role}"


def test_duplicate_post_titles_not_allowed(client):
    roles = ["author", "admin", "superadmin"]

    for role in roles:
        # Register and approve user
        user, email = register_any_user(client, role, approved=True)
        token = login(client, email).json["access_token"]

        # Register and approve admin to create category
        admin, admin_email = register_any_user(client, "admin", approved=True)
        admin_token = login(client, admin_email).json["access_token"]

        # Admin creates category
        category_resp = client.post(
            "/api/categories/create_category",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": f"{role}_dup_cat_{uuid.uuid4().hex[:6]}"}
        )
        assert category_resp.status_code == 201
        category_id = category_resp.json["id"]

        # Use the same title for both posts
        duplicate_title = f"Duplicate Title {uuid.uuid4().hex[:6]}"

        # First post creation should succeed
        post_resp_1 = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=MultiDict([
                ("title", duplicate_title),
                ("content", f"{role} original content"),
                ("category_id", str(category_id)),
                ("images", FileStorage(stream=BytesIO(b"img1"), filename="img1.jpg", content_type="image/jpeg"))
            ]),
            content_type="multipart/form-data"
        )
        assert post_resp_1.status_code == 201, f"{role} should be able to create the first post"

        # Second post with the same title should fail
        post_resp_2 = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=MultiDict([
                ("title", duplicate_title),
                ("content", f"{role} duplicate content"),
                ("category_id", str(category_id)),
                ("images", FileStorage(stream=BytesIO(b"img2"), filename="img2.jpg", content_type="image/jpeg"))
            ]),
            content_type="multipart/form-data"
        )
        assert post_resp_2.status_code == 400, f"{role} should not be able to create a duplicate title"
        assert "already exists" in post_resp_2.get_json().get("msg", "").lower()



def test_post_deletion_permissions(client):
    # Register and approve superadmin, admin, and author
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    author, author_email = register_any_user(client, "author", approved=True)

    superadmin_token = login(client, superadmin_email).json["access_token"]
    admin_token = login(client, admin_email).json["access_token"]
    author_token = login(client, author_email).json["access_token"]

    # Superadmin creates a category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": f"DeletePermCat {uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates a post (to be deleted by admin)
    title_1 = f"Deletable Post {uuid.uuid4().hex[:6]}"
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", title_1),
            ("content", "To be deleted."),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=BytesIO(b"dummy img"), filename="img.jpg", content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # ✅ Admin can delete
    admin_del_resp = client.delete(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_del_resp.status_code == 200

    # Recreate post (to be deleted by superadmin)
    title_2 = f"Another Deletable {uuid.uuid4().hex[:6]}"
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", title_2),
            ("content", "Again."),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=BytesIO(b"img2"), filename="img2.jpg", content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # ✅ Superadmin can delete
    superadmin_del = client.delete(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert superadmin_del.status_code == 200

    # Recreate post (to test rejection for author delete)
    title_3 = f"Unauthorized Delete {uuid.uuid4().hex[:6]}"
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", title_3),
            ("content", "Should fail."),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=BytesIO(b"img3"), filename="img3.jpg", content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # ❌ Author should not be allowed to delete
    author_del = client.delete(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {author_token}"}
    )
    assert author_del.status_code == 403



def test_unauthenticated_user_can_list_posts(client):
    # Register and approve author
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Superadmin for category creation
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    # Create a category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": f"PublicCat {uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates a post
    image_data = (BytesIO(b"public image"), "public.jpg")

    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Public Post {uuid.uuid4().hex[:6]}"),
            ("content", "This should be visible."),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201

    # ✅ Unauthenticated user fetches posts
    public_resp = client.get("/api/posts")
    assert public_resp.status_code == 200

    data = public_resp.get_json()
    assert isinstance(data, dict) or isinstance(data, list), "Response should be a list or dict of posts"
    assert "posts" in data or len(data) > 0, "Should return post data for public users"


def test_list_posts_by_category(client):
    # Register and approve superadmin and author
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Superadmin creates a category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": f"TechCat {uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates a post in that category
    image_data = (BytesIO(b"image content"), "img.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Tech Post {uuid.uuid4().hex[:6]}"),
            ("content", "Post in Tech category"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201

    # 🔍 Unauthenticated user fetches posts in this category
    resp = client.get(f"/api/posts/by_category/{category_id}")
    assert resp.status_code == 200

    data = resp.get_json()
    assert isinstance(data, dict) or isinstance(data, list)
    assert "posts" in data or len(data) > 0, "Should return posts under the category"



def test_authenticated_user_can_rate_post(client):
    # Register and approve admin (for category)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve author (to create post)
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Register and approve another user to rate the post
    rater, rater_email = register_any_user(client, "author", approved=True)
    rater_token = login(client, rater_email).json["access_token"]

    # Admin creates a category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"RateCat {uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates a post in that category
    image_data = (BytesIO(b"image data"), "post.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Rate Me {uuid.uuid4().hex[:6]}"), 
            ("content", "Please rate this post"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0],
                                   filename=image_data[1],
                                   content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Rater user rates the post
    rate_resp = client.post(
        f"/api/posts/rate/{post_id}",
        headers={"Authorization": f"Bearer {rater_token}"},
        json={"value": 5}
    )
    assert rate_resp.status_code == 200
    data = rate_resp.get_json()
    assert data is not None
    assert "msg" in data
    assert "rating added" in data["msg"].lower()



def test_user_can_view_post_details(client):
    # Register and approve an admin for category
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve an author
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Admin creates category
    cat_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"ViewCat {uuid.uuid4().hex[:6]}"}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]

    # Author creates post
    unique_title = f"Details Test {uuid.uuid4().hex[:6]}"
    image_data = (BytesIO(b"img"), "sample.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", unique_title), 
            ("content", "Testing details view"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Unauthenticated user fetches the post details
    detail_resp = client.get(f"/api/posts/{post_id}")
    assert detail_resp.status_code == 200
    data = detail_resp.get_json()
    assert data is not None
    assert data["title"] == unique_title
    assert "content" in data
    assert "category" in data
    assert "author" in data



def test_fetch_posts_by_author(client):
    # Register and approve admin (for category)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve author
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Admin creates category
    cat_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"AuthorCat {uuid.uuid4().hex[:6]}"}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]
    
    title_A = f"Post A {uuid.uuid4().hex[:6]}"
    title_B = f"Post B {uuid.uuid4().hex[:6]}"
    # Author creates two posts
    for title in [title_A, title_B]:
        image_data = (BytesIO(b"img content"), f"{title}.jpg")
        post_resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {author_token}"},
            data=MultiDict([
                ("title", title),
                ("content", f"Content of {title}"),
                ("category_id", str(category_id)),
                ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
            ]),
            content_type="multipart/form-data"
        )
        assert post_resp.status_code == 201

    # Unauthenticated user fetches posts by this author
    author_username = author.username

    fetch_resp = client.get(f"/api/posts/author/{author_username}")
    assert fetch_resp.status_code == 200

    data = fetch_resp.get_json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert len(data["results"]) == 2
    titles = [post["title"] for post in data["results"]]
    assert title_A in titles
    assert title_B in titles



def test_post_edit_permissions(client):
    # Create and approve users
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    author, author_email = register_any_user(client, "author", approved=True)

    superadmin_token = login(client, superadmin_email).json["access_token"]
    admin_token = login(client, admin_email).json["access_token"]
    author_token = login(client, author_email).json["access_token"]

    # Superadmin creates a category
    cat_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": f"EditTestCat_{uuid.uuid4().hex[:6]}"}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]

    # Author creates a post
    image = FileStorage(stream=BytesIO(b"image"), filename="img.jpg", content_type="image/jpeg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Editable Post {uuid.uuid4().hex[:6]}"),
            ("content", "Initial content"),
            ("category_id", str(category_id)),
            ("images", image)
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Prepare update payload
    updated_data = {
        "title": f"Updated Title {uuid.uuid4().hex[:6]}",
        "content": "Updated content",
        "category_id": category_id
    }
    #-----------------------------------------------------------------------
    # Author can edit their post
    #-----------------------------------------------------------------------
    # print(post_id)
    # print(author_token)

    resp_author = client.put(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json=updated_data
    )
    assert resp_author.status_code == 200
    #------------------------------------------------------------------------
    # Admin can edit any post
    #------------------------------------------------------------------------
    resp_admin = client.put(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=updated_data
    )
    assert resp_admin.status_code == 200
    # -----------------------------------------------------------------------
    # Superadmin can edit any post
    #------------------------------------------------------------------------
    resp_superadmin = client.put(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json=updated_data
    )
    assert resp_superadmin.status_code == 200



def test_search_posts(client):
    # Register and approve author and admin
    author, author_email = register_any_user(client, "author", approved=True)
    admin, admin_email = register_any_user(client, "admin", approved=True)

    author_token = login(client, author_email).json["access_token"]
    admin_token = login(client, admin_email).json["access_token"]

    # Admin creates a category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"SearchCat_{uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates 3 posts
    posts = [
        {
            "title": "Learn Flask Testing",
            "content": "This post teaches how to write Flask tests.",
            "image": (BytesIO(b"img1"), "img1.jpg")
        },
        {
            "title": "Advanced Flask",
            "content": "Content about Flask and SQLAlchemy tips.",
            "image": (BytesIO(b"img2"), "img2.jpg")
        },
        {
            "title": "React Integration",
            "content": "How to integrate Flask with React frontend.",
            "image": (BytesIO(b"img3"), "img3.jpg")
        },
    ]

    for post in posts:
        resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {author_token}"},
            data=MultiDict([
                ("title", post["title"]),
                ("content", post["content"]),
                ("category_id", str(category_id)),
                ("images", FileStorage(
                    stream=post["image"][0],
                    filename=post["image"][1],
                    content_type="image/jpeg"
                ))
            ]),
            content_type="multipart/form-data"
        )
        assert resp.status_code == 201

    # Search for "flask"
    search_resp = client.get("/api/posts/search_posts?q=flask")
    assert search_resp.status_code == 200

    data = search_resp.get_json()
    assert data["total"] >= 2
    assert any("flask" in p["title"].lower() or "flask" in p["content"].lower() for p in data["results"])