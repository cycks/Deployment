def test_unauthenticated_user_can_list_categories(client):
    # Arrange: Add sample categories if needed (optional)
    # You can use a test fixture or create manually
    from app.extensions import db
    from app.models.category import Category

    category1 = Category(name="Technology")
    category2 = Category(name="Science")
    db.session.add_all([category1, category2])
    db.session.commit()

    # Act: Make a GET request without authentication
    response = client.get("/api/categories/list_categorys")

    # Assert: Status is 200 and categories returned
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 2  # depending on how many categories you added
    names = [cat["name"] for cat in data]
    assert "Technology" in names
    assert "Science" in names




